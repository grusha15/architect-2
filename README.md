# Architect 2.0

A vibe-coding platform for **builders and developers** to create, import, iterate on and deploy **agentic applications** by prompting.

- **Live app:** _add your Vercel URL here_
- **Architecture write-up:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Architecture diagram:** [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg) (also at `/architecture` in the app)

---

## The idea in one line

Most tools force a handoff: you prototype in one place and rebuild in another. Architect 2.0 is **one Git-backed project seen through two lenses**. The **Preview lens** (chat, plan, live preview, click-to-edit) is for people who describe what they want. The **Code lens** (editor, terminal, diffs, branches) is for people who write code. Both edit the same thing.

## Design principles (first principles, not copied)

1. **Intent before code.** Every build starts with a plan you can read, edit and approve, so no credits are spent on the wrong app.
2. **Show the work at the right altitude.** A *Plain / Technical* toggle switches the same event stream between "Designing the Inbox page" and `write_file app/page.tsx`.
3. **Everything is reversible.** Every agent turn is a restore point (a git commit), and restore points show visual thumbnails.
4. **Agents are visible objects.** An Agent Studio with a graph, inspector, playground, traces and evals, across five frameworks.
5. **Nothing is hidden, only collapsed.** Onboarding sets your *default* view; every capability stays one click away.

## Feature flows

| # | Flow | Where | What to try |
|---|---|---|---|
| 01 | **Authentication** | `/login` | Google / GitHub / email magic link. Your prompt from the landing page is preserved through sign-in. |
| 02 | **Onboarding** | `/onboarding` | "How do you like to build?" sets the default lens (Preview vs Code) and detail level. |
| 03 | **Homepage / dashboard** | `/home` | Prompt composer (attach files, screenshot, Figma, prompt *Enhance*, framework and model pickers), Import / Template / Blank, projects, templates, deployments. |
| 04 | **Chat window** | `/p/:id` left panel | Clarifying questions → editable **Plan card** (toggle pages/agents, switch framework, cost estimate) → **Approve & build**. |
| 05 | **UI getting built** | Preview | Build timeline streams steps; the preview fills in section by section; a self-healed bug is shown; Stop / Resume. |
| 06 | **App preview** | Preview | Device frames, sandbox URL, console, **Visual edit** (click an element → "make this green"), restore points. |
| 07 | **Code lens** | `Code` tab | Monaco editor on framework-specific generated code, file tree, per-turn diff review (accept/reject), terminal (`help`, `ls`, `pytest`, `git log`, …). |
| 08 | **Agent section** | `Agents` tab | Agent graph with tools, inspector (instructions, model, tools, guardrails), playground with cost per step, traces waterfall, evals with a deploy gate. Switch between **Lyzr ADK, LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK**. |
| 09 | **GitHub integration** | Right rail → GitHub, and `/import` | Connect → create repo & push (**real** with GitHub sign-in), branch status, AI commit message, push/pull, open PR, merge. Import lists your **real** repos, detects the stack, proposes `architect.toml`, collects secrets, boots. |
| 10 | **Deploying the app** | **Publish** | Target (Architect Cloud / Vercel / Docker) → preflight checks (tests, evals, secret scan, missing secrets) → live logs → URL. Deployed app served at `/apps/:slug`; history with rollback; custom domains. |
| + | Secrets vault, Integrations & MCP, Database browser + SQL, Logs, Share & roles, Model picker + BYOK, Billing & spend caps, API tokens | Right rail, `/settings` | |

## What's real vs. simulated

| Real | Simulated (realistic dummy flows) |
|---|---|
| Google / GitHub / email auth (Supabase) | Sandbox execution and HMR |
| Postgres persistence with RLS (projects, plans, checkpoints, deployments, profiles) | Build steps, terminal, evals, traces |
| LLM plan generation through a model gateway (Anthropic / OpenAI / Gemini, with offline fallback) | Deploy pipeline (the deployed page itself is real and public) |
| GitHub: list your repos; create a repo and push generated code | PRs, OAuth for third-party integrations |

With no environment variables, the app runs fully in **demo mode** (local accounts, browser storage), so every flow can still be clicked through.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: fill in Supabase / model keys
npm run dev                  # http://localhost:3000
```

## Enable real auth + database (Supabase)

1. Create a Supabase project. Copy the **Project URL** and **anon key** into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. In the **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. **Authentication → URL configuration**: set Site URL to your deployed URL, and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.
4. **Authentication → Providers**:
   - **Google**: create an OAuth client in Google Cloud Console (Web). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret.
   - **GitHub**: create an OAuth App (GitHub → Settings → Developer settings). Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret.
5. Optional: add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY` so plans come from a real model.

## Deploy (Vercel)

```bash
npx vercel            # link the project
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Supabase (Auth + Postgres) · Monaco · lucide icons.

```
app/                 routes: landing, login, onboarding, home, import, settings, architecture, p/[id], apps/[slug], api/*
components/workspace Workspace orchestrator, ChatPanel, Preview + GeneratedApp, CodeLens, AgentStudio, panels, Deploy/Share modals
lib/                 auth, store (Supabase or local), planner, build steps, codegen, model gateway
docs/                ARCHITECTURE.md + architecture-diagram.svg
supabase/schema.sql  tables + RLS policies
scripts/diagram.py   regenerates the architecture diagram
```
