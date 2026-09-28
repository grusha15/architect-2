"""Generates docs/architecture-diagram.svg (run: python3 scripts/diagram.py)."""
from pathlib import Path

W, H = 1600, 1130
INK, INK2, INK3 = "#14161f", "#4a4e5c", "#80838f"
BP, BP50 = "#2747d6", "#eef1fd"
out = []


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def zone(x, y, w, h, label):
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#f6f5f1" stroke="#cfcbbf" stroke-dasharray="5 4"/>')
    out.append(f'<text x="{x+16}" y="{y+22}" class="zone">{esc(label)}</text>')


def box(x, y, w, h, title, subs=(), accent=False, dark=False):
    fill = BP50 if accent else ("#0e1017" if dark else "#ffffff")
    stroke = BP if accent else INK
    tcol = "#ffffff" if dark else INK
    scol = "#b9bfd6" if dark else INK2
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="{1.6 if accent else 1.1}"/>')
    out.append(f'<text x="{x+12}" y="{y+21}" class="t" fill="{tcol}">{esc(title)}</text>')
    for i, s in enumerate(subs):
        out.append(f'<text x="{x+12}" y="{y+38+i*14}" class="s" fill="{scol}">{esc(s)}</text>')


def path(d, dashed=False, color=INK2, arrow=True):
    dash = ' stroke-dasharray="4 4"' if dashed else ""
    marker = ' marker-end="url(#arr)"' if arrow else ""
    out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.5"{dash}{marker}/>')


def num(x, y, n):
    out.append(f'<circle cx="{x}" cy="{y}" r="10" fill="{BP}"/><text x="{x}" y="{y+3.6}" class="n" text-anchor="middle">{n}</text>')


def note(x, y, s, cls="s", color=INK3):
    out.append(f'<text x="{x}" y="{y}" class="{cls}" fill="{color}">{esc(s)}</text>')


# ---------------------------------------------------------------- title
out.append(f'<text x="40" y="50" class="h">Architect 2.0: System Architecture</text>')
note(40, 72, "Control plane on Kubernetes · untrusted code in Firecracker microVMs · one model gateway · Git as the source of truth · scale-to-zero app hosting", "s", INK2)

# ---------------------------------------------------------------- clients
box(40, 120, 200, 62, "Builder", ["Browser · Preview lens", "chat, plan, visual edit"])
box(40, 200, 200, 62, "Developer", ["Browser · CLI · IDE extension", "code lens, terminal, diffs"])
box(40, 567, 200, 56, "End users", ["People using deployed apps"])

# ---------------------------------------------------------------- edge
zone(270, 100, 250, 590, "EDGE · CLOUDFLARE")
box(290, 130, 210, 56, "CDN · WAF · DNS", ["TLS, bot/DDoS, static assets"])
box(290, 202, 210, 56, "API Gateway / BFF", ["REST · session JWT · rate limits"])
box(290, 274, 210, 56, "Realtime Gateway", ["WebSocket: events, terminal, logs"])
box(290, 346, 210, 106, "Preview Proxy", ["*.preview.architect.app → VM:port", "signed short-lived token", "wake paused VM on request", "HMR websocket passthrough", "injects visual-edit bridge"], accent=True)
box(290, 560, 210, 70, "App Ingress", ["*.architect.app + custom domains", "ACME TLS → app revisions"])

# ---------------------------------------------------------------- control plane
zone(560, 100, 530, 590, "CONTROL PLANE · KUBERNETES (MULTI-AZ)")
box(580, 130, 240, 56, "Auth Service", ["OAuth Google/GitHub · SSO · RBAC"])
box(580, 200, 240, 56, "Project Service", ["projects · plans · checkpoints · teams"])
box(580, 270, 240, 56, "Agent Orchestrator", ["Temporal: durable, resumable runs"])
box(580, 340, 240, 150, "Agent Harness Workers", ["PLAN → ACT → VERIFY → CHECKPOINT", "tools: read/write/patch, search,", "run_cmd, logs, screenshot, db_migrate,", "ask_user  ·  self-heal budget 3/error", "context: repo map + RAG + PLAN.md", "events → Redis → Realtime Gateway", "tool calls run in the VM via envd"], accent=True)
box(580, 506, 240, 56, "Usage & Billing", ["credits · spend caps · Stripe"])
box(580, 576, 240, 56, "Integrations & MCP", ["OAuth connectors · MCP registry"])

box(835, 130, 235, 70, "Sandbox Manager", ["claim · pause · snapshot · resume", "warm pools per template"])
box(835, 216, 235, 56, "Code Index", ["tree-sitter repo map · embeddings"])
box(835, 288, 235, 110, "Model Gateway", ["one API: messages + tools + stream", "adapters: Anthropic · OpenAI ·", "Google · Bedrock · vLLM (OSS)", "routing · fallback · BYOK · cache", "per-tenant token metering"], accent=True)
box(835, 414, 235, 56, "Git Service", ["GitHub App · install tokens · webhooks"])
box(835, 486, 235, 56, "Deploy Service", ["build → image → revision → DNS"])
box(835, 558, 235, 56, "Secrets Service", ["Vault + KMS · per-tenant keys"])
out.append(f'<line x1="580" y1="660" x2="1070" y2="660" stroke="{INK3}" stroke-width="1" stroke-dasharray="2 3"/>')
note(588, 678, "service mesh (mTLS) · every service is stateless and reads/writes the data tier ↓", "s", INK3)
path("M825 690 V772")

# ---------------------------------------------------------------- data
zone(560, 740, 538, 140, "DATA TIER")
for i, (t, a, b) in enumerate([
    ("Postgres", "metadata", "RLS · replicas"),
    ("Redis", "pub/sub", "queues · locks"),
    ("S3", "snapshots", "artifacts · logs"),
    ("pgvector", "code + docs", "embeddings"),
    ("ClickHouse", "traces", "usage · runs"),
    ("OTel", "Grafana", "alerts · SLOs"),
]):
    box(578 + i * 86, 772, 82, 92, t, [a, b])

# ---------------------------------------------------------------- sandboxes
zone(1130, 100, 440, 420, "SANDBOX FLEET · FIRECRACKER MICROVMS")
out.append(f'<rect x="1150" y="130" width="400" height="40" rx="8" fill="#fff" stroke="{INK}" stroke-width="1.1"/>')
note(1162, 154, "Warm pool · pre-booted per template", "t2", INK)
for i in range(6):
    out.append(f'<rect x="{1400 + i*23}" y="141" width="17" height="17" rx="4" fill="{BP50}" stroke="{BP}"/>')
out.append(f'<rect x="1150" y="186" width="300" height="252" rx="10" fill="#fff" stroke="{BP}" stroke-width="1.6"/>')
note(1162, 206, "microVM · one per active project", "t2", INK)
box(1166, 218, 268, 42, "envd: exec · fs · pty API (gRPC)", [])
box(1166, 268, 130, 56, "Dev server :3000", ["Next/Vite + HMR"])
box(1304, 268, 130, 56, "Agents API :8000", ["FastAPI · any framework"])
box(1166, 332, 268, 42, "/workspace git repo · turn = commit", [])
note(1168, 394, "2 vCPU · 4 GB · 10 GB disk · non-root user", "s", INK2)
note(1168, 410, "no host access · own kernel · jailer + seccomp", "s", INK2)
note(1168, 426, "ports exposed only through the Preview Proxy", "s", INK2)
box(1462, 186, 90, 118, "Egress", ["proxy", "allow-list", "injects keys", "blocks", "169.254.*"])
box(1462, 316, 90, 122, "Snapshots", ["pause when", "idle 5-10 min", "memory+disk", "→ object store", "resume < 2s"])
note(1150, 500, "Start on E2B (managed Firecracker); move to self-hosted on bare metal at scale.", "s", INK2)

# ---------------------------------------------------------------- external
zone(1130, 540, 440, 160, "EXTERNAL")
box(1150, 570, 130, 112, "LLM providers", ["Anthropic", "OpenAI", "Google", "vLLM (open-source)"])
box(1290, 570, 125, 112, "GitHub", ["App install", "REST / GraphQL", "push + PR webhooks"])
box(1425, 570, 125, 112, "Tool APIs", ["Slack · Gmail", "HubSpot · Stripe", "MCP servers"])

# ---------------------------------------------------------------- runtime
zone(1130, 740, 440, 350, "USER APP RUNTIME")
box(1150, 772, 190, 60, "Build workers", ["BuildKit · Nixpacks · isolated"])
box(1360, 772, 190, 60, "Image registry", ["immutable, signed images"])
box(1150, 850, 400, 80, "App hosting: Knative on K8s (or Cloud Run)", ["revision per deploy · scale-to-zero · min/max instances", "preview environment per branch · instant rollback"], accent=True)
box(1150, 948, 190, 70, "Postgres per app", ["Neon · branch per env", "copy-on-write previews"])
box(1360, 948, 190, 70, "Lyzr Agent Runtime", ["memory · RAG · guardrails", "evals · traces"])
note(1150, 1044, "Static assets are served from the CDN.", "s", INK2)
note(1150, 1060, "Scale-to-zero keeps idle apps near $0.", "s", INK2)
note(1366, 1044, "Deployed agents call the Model", "s", INK2)
note(1366, 1060, "Gateway: metered, keys server-side.", "s", INK2)

# ---------------------------------------------------------------- legend
zone(40, 740, 480, 350, "PROMPT → LIVE APP (NUMBERED PATH)")
steps = [
    "User types a prompt → CDN → API Gateway (session JWT)",
    "Project Service saves it; client opens a WebSocket",
    "Orchestrator starts a Temporal run; claims a warm microVM",
    "Harness asks the Model Gateway for a plan; user approves",
    "Tool loop: model → tool call → envd in VM → result → model",
    "Dev server hot-reloads; Preview Proxy streams it to the iframe",
    "Verify → git commit (checkpoint) → Git Service pushes to GitHub",
    "Publish → preflight → Deploy Service builds image from the SHA",
    "Knative revision + DB branch + secrets → health check → 100%",
    "End users hit app.architect.app → App Ingress → revision",
]
for i, s in enumerate(steps):
    num(66, 784 + i * 29, i + 1)
    note(86, 788 + i * 29, s, "s2", INK)

# ---------------------------------------------------------------- arrows
path("M240 151 H290")                                   # builder → CDN
path("M240 231 H262 V172 H290")                         # developer → CDN
num(265, 140, 1)
path("M395 186 V202")                                   # CDN → API
path("M500 228 H580"); num(540, 228, 2)                 # API → Project
path("M500 214 H538 V158 H580")                         # API → Auth
path("M700 256 V270")                                   # Project → Orchestrator
path("M700 326 V340")                                   # Orchestrator → Harness
path("M820 298 H827 V165 H835"); num(827, 245, 3)       # Orchestrator → Sandbox Mgr (claim)
path("M820 360 H835"); num(827, 374, 4)                 # Harness → Model Gateway
path("M1070 165 H1108 V239 H1166"); num(1108, 200, 5)   # Sandbox Mgr → envd
path("M1070 343 H1100 V626 H1150")                      # Model Gateway → LLMs
path("M500 420 H540 V702 H1120 V296 H1166", color=BP); num(800, 702, 6)   # Preview proxy → dev server
path("M500 302 H552 V752 H703 V772", dashed=True)       # Realtime ↔ Redis
path("M1070 442 H1092 V530 H1352 V570"); num(1092, 490, 7)  # Git → GitHub
path("M1070 514 H1086 V716 H1245 V772"); num(1180, 716, 8)  # Deploy → Build
path("M1340 802 H1360")                                 # Build → Registry
path("M1455 832 V850"); num(1475, 841, 9)               # Registry → Hosting
path("M240 595 H290")                                   # End users → Ingress
path("M500 610 H528 V1108 H1350 V930", color=BP); num(900, 1108, 10)  # Ingress → Hosting
path("M1245 930 V948")                                  # Hosting → Neon
path("M1455 930 V948")                                  # Hosting → Lyzr runtime
path("M1552 245 H1562 V556 H1487 V570", dashed=True)    # Egress → Tool APIs

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{INK2}"/></marker>
  <style>
    .h {{ font-size: 22px; font-weight: 700; fill: {INK}; letter-spacing: -0.3px; }}
    .zone {{ font-family: 'JetBrains Mono', Menlo, monospace; font-size: 10.5px; letter-spacing: 1.2px; fill: {BP}; font-weight: 600; }}
    .t {{ font-size: 13px; font-weight: 650; }}
    .t2 {{ font-size: 12.5px; font-weight: 650; }}
    .s {{ font-size: 10.5px; }}
    .s2 {{ font-size: 11.5px; }}
    .n {{ font-size: 10.5px; font-weight: 700; fill: #fff; }}
  </style>
</defs>
<rect width="{W}" height="{H}" fill="#ffffff"/>
{chr(10).join(out)}
</svg>
'''

root = Path(__file__).resolve().parent.parent
for p in [root / "docs" / "architecture-diagram.svg", root / "public" / "architecture-diagram.svg"]:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(svg)
print("wrote", len(svg), "bytes")
