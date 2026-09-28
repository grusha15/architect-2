# Architect 2.0: Technical Architecture

> How I would build Architect 2.0 for real: a vibe-coding platform where builders **and** developers create, import, iterate on and deploy agentic applications.
>
> Diagram: [`architecture-diagram.svg`](./architecture-diagram.svg) (also served live at `/architecture`).

---

## 0. TL;DR

| Concern | Decision | One-line reason |
|---|---|---|
| Where user code runs | **Firecracker microVM per active project** (start on **E2B**, move to self-hosted Firecracker on bare metal at scale) | AI-written code is untrusted; agent frameworks need real Linux + Python; ~150–250 ms starts from snapshots |
| Agent harness | **Custom plan → act → verify → checkpoint loop**, run as a **Temporal** workflow | Long, failure-prone, multi-step runs need durability, pause/resume, human approval and replay |
| Model choice | **Model Gateway** with one canonical message + tool schema and per-provider adapters | The harness never sees a provider SDK, so switching Claude ↔ GPT ↔ Gemini ↔ open-source is a routing key |
| Frontend ↔ backend | REST for CRUD + **one WebSocket per session** for events, terminal and logs (Redis pub/sub fan-out) | Real-time timeline and terminal; stateless, horizontally scalable sockets |
| Live preview | Real dev server in the VM, exposed at `https://<sandbox>-<port>.preview.architect.app` through the **Preview Proxy** | Real HMR, real network, real framework, not a simulation |
| Proxies | **Preview Proxy** (ingress to sandboxes), **Egress Proxy** (sandbox → internet), **Model Gateway** (LLM proxy) | Three choke points for routing, security, secrets and metering |
| GitHub | **GitHub App** (fine-grained, short-lived installation tokens) + webhooks; **every agent turn is a git commit** | Git is the source of truth: versioning, restore points, export, no lock-in |
| User app deploys | Commit SHA → isolated build → OCI image → **Knative (scale-to-zero)** revision + **Neon** Postgres branch + secrets | Thousands of mostly-idle apps cost near zero; immutable revisions give instant rollback |
| Architect itself | Multi-AZ **Kubernetes** (EKS/GKE) control plane, dedicated bare-metal sandbox pools, Terraform + ArgoCD, Cloudflare edge | Standard, portable and auditable; the sandbox fleet is isolated from the control plane |
| Scale | Stateless services autoscaled on queue depth (KEDA), warm pools + hibernation for VMs, per-tenant quotas, **cell-based** regions | The binding constraints are **VM memory** and **LLM throughput/cost**, so the design optimizes those two |

---

## 1. Design principles

1. **Untrusted by default.** Everything the agent writes or runs is hostile until proven otherwise. Isolation happens at the VM boundary, not the container boundary.
2. **Git is the source of truth.** Checkpoints, undo, GitHub sync, deploys and the Code lens are all views over one repository. There is no proprietary project format.
3. **One project, two lenses.** Builders (Preview lens) and developers (Code lens) read and write the *same* state. The architecture must never fork into a "no-code representation" and a "code representation."
4. **The harness is model-agnostic; the prompts are not.** One canonical interface, plus per-model prompt packs and evals.
5. **Durable, resumable, observable.** Any agent run can survive a pod dying, be paused for human input, and be replayed from its history.
6. **Scale to zero everywhere.** Idle sandboxes hibernate; idle apps have zero instances. Cost follows activity.

---

## 2. Reading the diagram

The diagram has seven zones. Numbers ①–⑩ trace the critical path from prompt to live app (Section 3).

| Zone | Contents |
|---|---|
| **Clients** | Builder (browser), Developer (browser, `architect` CLI, IDE extension), End users of deployed apps |
| **Edge (Cloudflare)** | CDN/WAF/DNS, API Gateway/BFF, Realtime Gateway (WebSocket), **Preview Proxy**, App Ingress |
| **Control plane (K8s)** | Auth, Project, Agent Orchestrator (Temporal), **Agent Harness workers**, **Model Gateway**, Sandbox Manager, Code Index, Git, Deploy, Secrets, Integrations/MCP, Usage & Billing |
| **Data tier** | Postgres (metadata), Redis (pub/sub, queues, locks), S3 (snapshots, artifacts, logs), pgvector (code/doc embeddings), ClickHouse (traces, usage), OTel/Grafana |
| **Sandbox fleet** | Warm pool → per-project Firecracker microVM running `envd` (exec/fs/pty API), the dev server, the agent API and a git repo; Egress Proxy; snapshot store |
| **External** | LLM providers (Anthropic, OpenAI, Google, self-hosted vLLM), GitHub, tool APIs (Slack, Gmail, HubSpot, MCP servers) |
| **User app runtime** | Build workers, image registry, Knative app hosting, Neon Postgres per app, Lyzr Agent Runtime |

---

## 3. What happens from prompt to live app

This walkthrough follows a builder typing *"A support triage desk that classifies Zendesk tickets, drafts replies and escalates angry VIPs to Slack."*

**① Prompt → API.** The browser sends `POST /v1/projects` through Cloudflare to the **API Gateway** with the session JWT, prompt, attachments (uploaded to S3 through pre-signed URLs), preferred model and framework. The gateway authenticates, applies per-tenant rate limits and forwards the request to the **Project Service**.

**② Project + socket.** The Project Service writes `projects`, `sessions` and `messages` rows to Postgres and returns `projectId` and `sessionId`. The browser opens `wss://rt.architect.app/sessions/:id` on the **Realtime Gateway**, which subscribes to the Redis channel `session:<id>`. From now on, every agent event reaches the UI through this socket.

**③ Durable run + sandbox claim.** The Project Service starts a Temporal workflow `BuildSession(sessionId)`. Its first activity asks the **Sandbox Manager** to claim a VM from the warm pool for the `nextjs-fastapi` template (≈200 ms, because the VM is already booted with dependencies installed). The manager records `sandboxId → host, vsock/IP` and attaches the project's persistent volume (or restores its last snapshot).

**④ Plan.** The harness builds the planning context (the prompt, the answers to clarifying questions, template docs and the workspace's past plans) and calls the **Model Gateway** with `purpose=plan`. The router picks a frontier model. The streamed JSON plan (pages, agents, data model, integrations, estimate) goes out as `plan.delta` events, and the UI renders the **Plan card**. The workflow now **waits on a signal**: the user edits and approves the plan. That can take seconds or days; Temporal holds the state, and no worker sits idle waiting.

**⑤ Tool loop.** After approval, the harness enters the loop (Section 5):
`model → tool_call(write_file | apply_patch | run_command | …) → Sandbox Manager → envd in the VM → result → model`.
Every step emits `step.started`, `tool.called`, `file.changed` and `step.done` to Redis, which fan out to the socket. The builder sees "Designing the Inbox page"; the developer toggles *Technical* and sees `write_file app/page.tsx`.

**⑥ Live preview.** The dev server (Next/Vite with HMR) is already running inside the VM. The preview iframe loads `https://sbx-7f3a-3000.preview.architect.app`. The **Preview Proxy** checks the signed preview token, finds the VM for `sbx-7f3a`, and proxies HTTP and the HMR WebSocket to port 3000. Each file write triggers HMR, so the UI appears section by section while it is being written.

**⑦ Verify + checkpoint + Git.** After each turn, the harness runs the verification suite: typecheck, lint, unit tests, `GET /api/health`, and a **headless-browser screenshot** that a vision model compares against the plan. Failures feed back into the loop, with a budget of 3 attempts per error signature. On success: `git commit` inside the VM (**this commit is the restore point**) plus a preview thumbnail to S3. If GitHub is connected, the **Git Service** pushes the branch using a short-lived installation token.

**⑧ Publish.** The user clicks **Publish**. Preflight runs (build, tests, eval score ≥ threshold, secret scan, required secrets present). The **Deploy Service** starts an isolated **build worker** (BuildKit/Nixpacks) from the commit SHA. Nothing is built from the live sandbox filesystem, so every deploy is reproducible. The result is a signed OCI image pushed to the registry.

**⑨ Release.** The Deploy Service creates a **Knative revision** (min 0 instances, max N), provisions or points at the app's **Neon** database branch for that environment, injects secrets from the vault, waits for the health check, and shifts traffic to 100%. DNS for `support-triage.architect.app` (or a custom domain with an ACME certificate) points at **App Ingress**.

**⑩ Live.** End users hit the URL → App Ingress → the revision (cold start ≈ 300–800 ms from zero, instant when warm). The app's agents call LLMs **through the Model Gateway**, so usage is metered per app and provider keys never ship inside user images. Meanwhile, the builder's sandbox has idled, been **snapshotted to S3** and paused. Reopening the project resumes it in under 2 s.

---

## 4. Sandboxes: where each user's app runs

### 4.1 Requirements
- Run **untrusted, AI-generated code** for thousands of tenants on shared hardware.
- **Full Linux**: Python *and* Node, native packages (`psycopg`, `numpy`, headless Chromium for screenshots), long-running dev servers, background agent processes.
- **Fast**: first preview in seconds; resume in under 2 s.
- **Stateful** across sessions (the project filesystem and its git history) but **cheap** when idle.

### 4.2 Options considered

| Option | Isolation | Python / native | Start time | Verdict |
|---|---|---|---|---|
| Browser WebContainers (Bolt's approach) | Browser sandbox | ✗ Node-centric; no native binaries; weak Python | Instant | Great for front-end toys; **rules out Python agent frameworks** |
| Plain Docker containers | Shared kernel | ✓ | ~1 s | **Too weak** for hostile multi-tenant code (kernel escapes) |
| gVisor (runsc) | User-space kernel | ✓ (some syscall gaps) | ~1 s | Good isolation; syscall overhead hurts `npm install` and builds |
| Kata Containers | microVM behind the container API | ✓ | 1–2 s | Viable; more moving parts than using Firecracker directly |
| **Firecracker microVMs** (E2B, Fly Machines and AWS Lambda use it) | **Hardware virtualization, own kernel** | ✓ | **~125 ms boot, ~150–250 ms from snapshot** | ✅ **Chosen** |
| Managed: E2B / Daytona / Modal sandboxes | Varies (E2B = Firecracker) | ✓ | Fast | ✅ **Start on E2B**, keep the Sandbox Manager interface provider-neutral |

**Decision:** Firecracker microVMs. For v1, use **E2B** (managed Firecracker with an SDK for exec, filesystem, pty and port forwarding) to ship in weeks, not quarters. Keep our own **Sandbox Manager** interface (`claim/exec/fs/pty/expose/pause/resume/snapshot/destroy`) so we can move to **self-hosted Firecracker on bare-metal nodes** (for example, i4i/m7i `.metal`) when volume makes the unit economics worth it. That becomes likely beyond roughly 1–2k concurrent VMs.

### 4.3 Inside a sandbox
```
microVM (2 vCPU, 4 GB, 10 GB disk — tier-dependent)
├── envd            gRPC agent over vsock: exec, fs (read/write/watch), pty, port list
├── /workspace      the project's git repo (persistent volume or snapshot)
├── dev server      :3000  Next.js / Vite with HMR
├── api + agents    :8000  FastAPI + the chosen agent framework
└── tools           ripgrep, tree-sitter, headless Chromium, uv, pnpm (preinstalled)
```
- **Unprivileged user**, jailer + seccomp, no host filesystem, no instance-metadata access.
- **Network**: no inbound except through the Preview Proxy. Outbound goes through the **Egress Proxy** (Section 7.2).
- **Templates** are pre-built rootfs images per stack (`nextjs-fastapi`, `langgraph`, `crewai`, `claude-agent-sdk`, …) with dependencies pre-installed. A **warm pool** keeps N booted VMs per template per region, sized from the last hour's claim rate.
- **Lifecycle**: `claimed → active → idle (no socket or HTTP for 5–10 min) → snapshot (memory + disk diff → S3) → paused → resumed on the next request`. Hard TTLs and CPU caps stop runaway processes.
- **Imported repos**: the Sandbox Manager clones into `/workspace`, and a detection step (package managers, frameworks, ports, `.env.example`, test runners) proposes an `architect.toml` that the user can edit. Unknown stacks fall back to a "terminal-only" mode instead of failing.

---

## 5. The agent harness

The harness is the product's brain. It is **our code**, not a vendor's, because it holds the moat: tools, context engineering, verification and recovery.

### 5.1 Loop
```
          ┌──────────── clarify (≤3 questions, only if ambiguous)
          ▼
PLAN ─► user approves (Temporal signal) ─► ACT ─► VERIFY ─► CHECKPOINT ─► next task
          ▲                                  │        │
          └──── re-plan on scope change ◄────┘   fail ─► self-heal (budget) ─► escalate
```
- **Plan**: a structured JSON plan becomes `PLAN.md` in the repo. The plan (not the chat log) is the durable description of intent, and it is re-read on every turn.
- **Act**: a standard tool-use loop. The model emits tool calls; the harness validates arguments against JSON Schema, executes them in the VM through `envd`, truncates or summarizes large outputs, and appends the results.
- **Verify** after every turn: `typecheck`, `lint`, `test`, HTTP health check, and a **visual check** (Playwright screenshot plus a vision-model comparison to the plan). The agent is never done until verification passes or it escalates.
- **Checkpoint**: `git commit` with an AI-written message, plus a preview thumbnail. Restore is `git checkout <sha>` plus a DB migration rollback on the preview branch.

### 5.2 Tools (small, typed, composable)
`read_file`, `write_file`, `apply_patch` (unified diff, cheaper and safer than whole-file rewrites), `list_dir`, `search_code` (ripgrep + embeddings), `run_command` (with timeout, streamed output, and background mode for servers), `get_logs`, `screenshot_preview`, `install_package`, `db_query`/`db_migrate` (preview branch only), `web_fetch` (through egress), `ask_user` (pauses the workflow), `spawn_subagent` (for example, a test writer or a reviewer).

### 5.3 Context engineering
- **Repo map**: tree-sitter symbols per file, ranked by relevance to the task. This is always in context and cheap.
- **Retrieval**: pgvector embeddings of code and docs (framework docs, template docs, the user's uploads).
- **Project memory**: `PLAN.md` and `ARCHITECT.md` (conventions and "rules" the user or the agent writes, the same idea as `CLAUDE.md` / `.cursorrules`).
- **Rolling summaries** of long sessions, plus **prompt caching** of the stable prefix (system prompt, tool schemas, repo map). This is the single biggest cost lever.

### 5.4 Error recovery (how I'd keep it from going off the rails)
| Failure | Handling |
|---|---|
| Build or test failure | Parse the error into a **signature** (file, rule, message hash). Feed back a structured summary, not 5,000 lines of log. **Max 3 attempts per signature.** |
| Same error repeating | Escalate to a stronger model (router `purpose=debug`), then **stop and explain** in plain English with options: *restore last good checkpoint · try another model · invite a developer* |
| Tool timeout / VM crash | The Temporal activity retries with backoff; the VM is restored from the last snapshot and the step is replayed |
| Provider 429 / 5xx | The gateway falls back through the chain (for example, Claude → GPT → Gemini for the same capability tier); the harness is unaware |
| Runaway spend | Per-run token and credit budget; the workflow pauses and asks the user before exceeding it |
| Preview broken mid-build | The Preview Proxy keeps serving the **last healthy build** until verification passes |

### 5.5 Why Temporal
Agent runs are long (minutes to hours), involve humans (plan approval, `ask_user`), and fail in the middle. Temporal provides durable state, retries, timers, signals, cancellation ("Stop" in the UI), and a full event history we can **replay** to debug a bad run. *Alternatives:* Inngest or Restate are lighter; a hand-rolled Redis queue loses durability and replay.

### 5.6 How I'd take care of the harness (quality ops)
- **Offline eval suite**: about 300 canonical tasks (build an app from a prompt, fix a failing test, add a node to a LangGraph graph, import repo X) run nightly per model and prompt-pack version. Metrics: pass rate, turns, tokens, cost, time-to-green.
- **Online metrics**: *accepted-change rate* (not reverted within 24 h), self-heal success rate, error-loop rate, cost per successful build, and P95 time to first preview.
- **Shadow deploys** of new prompt packs to a slice of traffic; automatic rollback on regression.
- **Trace everything** (OpenTelemetry spans per tool call to ClickHouse) so any run can be inspected and replayed.

---

## 6. Model-agnostic by construction

**Problem:** providers differ in message formats, tool-call shapes, streaming events, structured-output support, context limits, caching semantics and error codes. If those differences leak into the harness, every model switch breaks something.

**Solution: the Model Gateway**, a separate stateless service (think LiteLLM, extended with our routing and metering).

```
harness ──► POST /v1/complete  { purpose, messages[], tools[], response_schema?, stream: true }
                     │
          ┌──────────┴───────────┐
          │ router: purpose + tenant policy + model capability registry
          │ adapters: anthropic | openai | google | bedrock | vllm (OpenAI-compatible)
          │ normalize: tool_calls ⇄ canonical, stream events ⇄ canonical deltas
          │ cache: provider prompt caching + semantic cache for plans
          │ fallback chain on 429/5xx/timeouts · circuit breakers
          │ metering: tokens + $ per tenant/project/app → ClickHouse → billing
          └──────────────────────┘
```
- **Canonical schema**: messages with typed content parts (text, image, tool_use, tool_result) and JSON-Schema tools. Every adapter maps both ways.
- **Capability registry**: per model, it records context window, tool-use reliability, vision support, JSON mode, cost and latency. The router uses it (for example, `purpose=plan` → frontier; `purpose=edit` → fast and cheap; `purpose=vision_check` → a vision model).
- **Prompt packs per model family**: the same intent, tuned wording, and examples. Versioned and evaluated (Section 5.6). This is where model-agnostic systems usually break, so it's explicit.
- **BYOK**: users can add their own keys (stored encrypted with KMS, never sent to the client). The gateway uses them for that tenant's traffic.
- **Open-source**: self-hosted models on a vLLM/TGI GPU pool behind an OpenAI-compatible API. That's just another adapter.
- **The same gateway serves deployed apps.** User agents call `https://llm.architect.app/v1` with a per-app token, so apps can switch models from the Agent Studio **without a redeploy**, and spend caps apply in production.

*In this prototype:* `lib/gateway.ts` implements the pattern with Anthropic, OpenAI and Gemini adapters behind one `complete()` call, plus routing and fallback. `/api/plan` uses it and falls back to a deterministic planner when no key is configured.

---

## 7. How the pieces talk (frontend ↔ backend ↔ sandbox)

### 7.1 Channels
| Channel | Protocol | Used for |
|---|---|---|
| Browser → API Gateway | HTTPS REST (JSON) | projects, plans, secrets, deploys, settings |
| Browser ↔ Realtime Gateway | **WebSocket** (one per session) | agent events, terminal (pty bytes), logs, presence |
| Browser → Preview Proxy | HTTPS + WebSocket in an **iframe** on a separate origin | the live app and its HMR socket |
| Harness → Sandbox Manager → `envd` | gRPC over vsock/private network | exec, fs, pty, ports |
| Services ↔ Redis | pub/sub + streams | event fan-out with replay offsets |

**Event protocol** (server → client), with a monotonically increasing `seq` per session:
`plan.delta`, `plan.ready`, `step.started`, `tool.called`, `tool.result`, `file.changed`, `preview.ready`, `verify.result`, `checkpoint.created`, `agent.message`, `run.paused`, `run.failed`, `deploy.progress`. On reconnect the client sends `lastSeq`, and the gateway replays from the Redis stream, so a laptop that sleeps mid-build doesn't lose the timeline.

**Visual edit bridge:** the Preview Proxy injects a tiny script into HTML responses. In edit mode it highlights elements and, on click, `postMessage`s `{selector, sourceLocation}` to the parent (from React dev source maps). The agent receives an exact file and line, which makes edits scoped, cheap and accurate.

### 7.2 Where the proxies sit and what they do
1. **Preview Proxy** (edge ingress to sandboxes). A Go/Envoy fleet behind Cloudflare, serving the wildcard `*.preview.architect.app`.
   - Parses `<sandboxId>-<port>` from the host and resolves it to a VM address through the Sandbox Manager's routing table (cached in Redis).
   - Validates a **signed, short-lived preview token** (cookie scoped to that subdomain), because previews of private projects must not be public.
   - **Wake-on-request**: if the VM is paused, it holds the request, triggers resume and serves a "waking up…" interstitial if resume takes more than 1 s.
   - WebSocket passthrough (HMR), gzip, and request logging to the console panel.
   - Keeps a **last-healthy build** fallback during a broken build.
   - **Separate registrable domain** from `architect.app`, so user code can never read Architect's cookies (origin isolation).
2. **Egress Proxy** (sandbox → internet). Every VM's outbound traffic goes through it.
   - Blocks `169.254.169.254` and other metadata/private ranges, and applies abuse controls (mining pools, spam, bandwidth caps).
   - **Secret injection**: the VM calls `https://llm.internal/...` or third-party APIs with a placeholder, and the proxy adds the real credential. Keys **never enter the VM**, so a malicious dependency can't exfiltrate them.
   - Package-registry caching (npm/PyPI mirror) makes installs fast and resilient.
3. **Model Gateway** (LLM proxy). Covered in Section 6; it proxies every model call from the harness *and* from deployed apps.

---

## 8. GitHub integration

**GitHub App** (not a classic OAuth app), because it gives fine-grained, per-repo permissions (contents, pull requests, metadata, webhooks), **short-lived installation tokens** (1 h) minted on demand, and org-level install and approval. User OAuth is only used for identity ("sign in with GitHub") and for listing the user's installations.

| Flow | What happens |
|---|---|
| **Connect** | User installs the App on selected repos or an org → `installation_id` stored per workspace |
| **Create repo** | Git Service mints a token → `POST /user/repos` (or `/orgs/:org/repos`) → pushes the current `/workspace` history → registers webhooks |
| **Import** | Shallow clone into a fresh VM → stack detection → `architect.toml` → boot. The work branch is `architect/<session>` |
| **Every agent turn** | `git commit` in the VM (the checkpoint). With auto-push on, the Git Service pushes the work branch |
| **Open PR** | `POST /repos/:o/:r/pulls` with an agent-written description (plan diff, verification results, evals). CI runs as usual; Architect subscribes to `check_run` events and shows CI status in the Git panel |
| **Two-way sync** | `push` webhook → Git Service → if the pushed branch is the active one, the VM does `git fetch && git rebase`. On conflict, the harness proposes a resolution as a normal diff for a human to approve. **Architect never force-pushes, and never pushes to the default branch without a PR** (configurable for solo builders) |
| **Security** | Tokens are minted per operation and never stored in the VM; the Egress Proxy injects them for `git push` to `github.com` only |

*In this prototype:* signing in with GitHub (Supabase OAuth with `repo` scope) makes **import list your real repositories**, and **"Create & push" creates a real repo and commits the generated files** through the GitHub REST API. Without GitHub sign-in, the same UI runs a simulated flow.

---

## 9. Deploying users' apps

```
commit SHA ─► build worker (isolated, no secrets) ─► OCI image (signed, SBOM) ─► registry
          ─► Knative Service revision  (min 0 · max N · concurrency 80)
          ─► Neon DB branch for env    (preview = copy-on-write branch of prod)
          ─► secrets from vault        (mounted as env at runtime, never baked into the image)
          ─► health check ─► traffic 0% → 100% ─► DNS / custom domain (ACME)
```
- **Why Knative on Kubernetes (or Cloud Run)**: request-driven scale-to-zero is essential when 90% of vibe-coded apps get little traffic. Each deploy is an **immutable revision**, which makes rollback a traffic shift (seconds) and makes per-branch **preview environments** cheap.
- **Front end**: static assets are pushed to the CDN; SSR routes run in the same revision.
- **Agents**: run in the app's API container, or on the **Lyzr Agent Runtime** for managed memory, RAG, guardrails, evals and traces (Lyzr's existing strength). The `agent.manifest.json` makes the choice a config switch.
- **Database**: **Neon** serverless Postgres gives a branch per environment, scale-to-zero compute and instant copy-on-write previews. Supabase is an alternative when users want its auth and storage.
- **Deploy gates**: preflight (build, tests, eval score ≥ threshold, secret scan, required secrets present). Failures are explained in plain English with "Fix with agent."
- **Other targets**: *Vercel* (front end), or *Docker export* (image + compose + Terraform) for teams deploying to their own cloud. That keeps the "no lock-in" promise.

---

## 10. Deploying Architect 2.0 itself

| Layer | Choice |
|---|---|
| Cloud | AWS primary (EKS, bare-metal EC2 for Firecracker, Aurora Postgres, ElastiCache, S3, KMS); the design is portable to GCP |
| Edge | Cloudflare: DNS, CDN, WAF, DDoS, Workers for edge auth checks on preview domains |
| Control plane | EKS, multi-AZ; services in Go/TypeScript; Temporal Cloud (or self-hosted Temporal on Aurora) |
| Sandbox fleet | Dedicated **bare-metal node groups** per region, running our Firecracker orchestrator (or E2B in v1). Isolated VPC; no route to the control-plane DBs |
| App runtime | Separate EKS cluster(s) with Knative + Kourier; separate AWS account (blast-radius isolation) |
| IaC / CD | Terraform for infrastructure, ArgoCD GitOps for services, progressive delivery with Argo Rollouts (canary + automated analysis) |
| Environments | dev → staging (prod-like, synthetic users running the eval suite) → prod; feature flags (for example, OpenFeature) for rollouts |
| Observability | OpenTelemetry → Grafana (metrics/logs/traces) + ClickHouse (agent traces and usage); SLOs on time-to-first-preview, harness success rate and deploy success |
| DR | Aurora cross-region replicas, S3 CRR for snapshots, and cell evacuation runbooks. RPO 5 min, RTO 1 h for the control plane |
| Security | SOC 2 controls, per-tenant KMS keys for secrets, audit log, SSO/SCIM for enterprise, pen-tested sandbox escape surface |

---

## 11. Scaling to thousands of concurrent builders

**Illustrative capacity math** for 5,000 concurrent active build sessions and 50,000 deployed apps:

| Resource | Estimate | Strategy |
|---|---|---|
| Sandbox VMs | 5k active VMs; average real use ≈ 0.3 vCPU / 1.5 GB (they mostly wait on the LLM) | Overcommit CPU about 3×, memory balloon + snapshots; roughly 150–200 VMs per 96-vCPU/384 GB metal node → **about 30 nodes** + a 15% warm pool |
| LLM traffic | ~1 call per active session every 8 s → ~600 req/s; ~20k input tokens per call, mostly cacheable | Prompt caching (70–90% of the prefix), patch-based edits, cheap models for small edits, provider **rate-limit pools** across accounts and regions, queue with per-tenant fair share |
| WebSockets | 5k–20k concurrent sockets | Stateless Realtime Gateway pods (~10k sockets each), Redis streams for fan-out and replay |
| Deployed apps | 50k apps, ~95% idle | Knative scale-to-zero; only hot apps hold instances |
| Builds | Bursty | Build workers autoscaled on queue depth (KEDA); layer caching per template |

**Patterns:**
- **Cell-based architecture**: a *cell* is a regional slice (control-plane workers + sandbox nodes + Redis shard) serving a subset of workspaces. Adding capacity means adding cells, and an outage is contained to one cell.
- **Backpressure, not failure**: if the warm pool is empty or the LLM pool is saturated, sessions queue with an honest ETA in the UI, and paid tiers get priority lanes.
- **Stateless everything** except the data tier; autoscale on the right signal (queue depth, sockets, claim rate), not CPU.
- **Hibernate aggressively**: idle VMs snapshot after 5–10 minutes. Resume is fast enough (under 2 s) that users don't notice.
- **Multi-region**: workspaces pinned to a home region (latency and data residency), with preview domains per region.

---

## 12. Security & multi-tenancy (summary)
- Hardware-virtualized isolation per project; no shared kernels between tenants.
- Separate origins: `architect.app` (product), `*.preview.architect.app` (previews), `*.architect.app` apps behind a public-suffix-style boundary.
- Secrets live only in the vault, are injected by the proxy at runtime, are scanned out of commits, and are shown to the user as last-4 only.
- Postgres row-level security by `workspace_id`; every service call carries tenant context; the audit log is append-only.
- Abuse: egress policies, CPU anomaly detection (mining), content scanning of deployed apps (phishing), verified accounts for custom domains.

---

## 13. Core data model (control plane)
```
workspaces(id, name, plan, region)
members(workspace_id, user_id, role: viewer|builder|developer|admin)
projects(id, workspace_id, name, status, framework, repo_url, default_branch, sandbox_id)
sessions(id, project_id, model, temporal_workflow_id, status)
messages(id, session_id, role, content, seq)
plans(id, project_id, version, json, approved_by, approved_at)
checkpoints(id, project_id, commit_sha, title, thumbnail_url, created_at)
deployments(id, project_id, env, revision, image_digest, url, status, created_at)
secrets(id, project_id, key, kms_ciphertext, last4)      -- value never leaves the Secrets Service
integrations(id, project_id, provider, token_ref, scopes)
usage_events(ts, workspace_id, project_id, kind, tokens, cost)  -- ClickHouse
```

---

## 14. How the architecture serves both audiences

| Need | Builder (non-technical) | Developer (technical) | Shared mechanism |
|---|---|---|---|
| See progress | Plain-English timeline | Tool calls, diffs, terminal | One event stream, two renderers |
| Undo | Visual restore points | `git log` / `git checkout` | Every turn is a commit |
| Change the UI | Click-to-edit in the preview | Edit in Monaco | Same files; visual edit gives source locations |
| Models | "Auto" | Per-task or per-agent model picker, BYOK | Model Gateway |
| Agents | Graph + playground + evals | Framework code (LangGraph, CrewAI, …) | `agent.manifest.json` adapter |
| Ship | One-click publish with preflight | Branches, PRs, CI, preview envs | Deploy Service + GitHub App |

---

## 15. Build vs buy

| Component | v1 | Later | Why |
|---|---|---|---|
| Sandboxes | **Buy** (E2B) | Build (self-hosted Firecracker) | Speed to market now; margin at scale |
| Workflow engine | **Buy** (Temporal Cloud) | — | Durability is hard to get right |
| Model Gateway | **Build** (on LiteLLM ideas) | — | Routing, metering and prompt packs are our moat |
| Agent harness | **Build** | — | This *is* the product |
| App hosting | **Build on** Knative/EKS | — | Control of cost and rollback semantics |
| Database per app | **Buy** (Neon) | — | Branching + scale-to-zero out of the box |
| Auth | **Buy** (Supabase Auth / WorkOS for SSO) | — | Commodity |

---

## 16. What this prototype implements vs. what's simulated

| Area | Prototype | Real system (above) |
|---|---|---|
| Authentication | **Real** Supabase Auth: Google & GitHub OAuth, email magic link (demo fallback if not configured) | Same + SSO/SCIM |
| Database | **Real** Supabase Postgres with RLS (`supabase/schema.sql`): profiles, projects (plan, checkpoints, deployments, git state) | Section 13 |
| Plan generation | **Real** LLM call through a mini model gateway (Anthropic/OpenAI/Gemini adapters + fallback) | Section 6 |
| GitHub | **Real** repo listing on import + **real** create-repo-and-push with the user's GitHub OAuth token; PR flow simulated | GitHub App (Section 8) |
| Sandbox, build loop, preview | Simulated with realistic events, a timeline and progressive reveal of a generated app | Sections 4, 5, 7 |
| Code lens | Real Monaco editor over generated framework-specific code; simulated terminal | Real pty over WebSocket |
| Agent Studio | Graph, inspector, playground, traces and evals (simulated runs) | Harness + traces in ClickHouse |
| Deploy | Full preflight → deploy → live URL flow; the "deployed app" renders at `/apps/<slug>` from the stored plan | Section 9 |
