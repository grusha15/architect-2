"""Generates docs/architecture-v1.svg: the simple architecture we'd ship first (run: python3 scripts/diagram_v1.py)."""
from pathlib import Path

W, H = 1500, 700
INK, INK2, INK3 = "#14161f", "#4a4e5c", "#80838f"
BP, BP50 = "#2747d6", "#eef1fd"
out = []


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def zone(x, y, w, h, label):
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#f6f5f1" stroke="#cfcbbf" stroke-dasharray="5 4"/>')
    out.append(f'<text x="{x+16}" y="{y+22}" class="zone">{esc(label)}</text>')


def box(x, y, w, h, title, subs=(), accent=False):
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{BP50 if accent else "#fff"}" stroke="{BP if accent else INK}" stroke-width="{1.6 if accent else 1.1}"/>')
    out.append(f'<text x="{x+14}" y="{y+24}" class="t">{esc(title)}</text>')
    for i, s in enumerate(subs):
        out.append(f'<text x="{x+14}" y="{y+43+i*16}" class="s">{esc(s)}</text>')


def path(d, color=INK2, dashed=False):
    dash = ' stroke-dasharray="4 4"' if dashed else ""
    out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#arr)"/>')


def num(x, y, n):
    out.append(f'<circle cx="{x}" cy="{y}" r="11" fill="{BP}"/><text x="{x}" y="{y+4}" class="n" text-anchor="middle">{n}</text>')


def label(x, y, s):
    out.append(f'<text x="{x}" y="{y}" class="l">{esc(s)}</text>')


out.append('<text x="40" y="52" class="h">Architect 2.0: v1 architecture</text>')
out.append(f'<text x="40" y="76" class="s" fill="{INK2}">What we would ship first. One service we own, managed sandboxes, and existing hosts for user apps.</text>')

box(40, 130, 190, 110, "Builder / Developer", ["Browser: chat, preview,", "code, agent studio"])
box(40, 470, 190, 64, "End users", ["People using the apps"])

box(280, 130, 220, 110, "Web app", ["Next.js on Vercel", "chat, preview iframe,", "editor, agent studio"])
box(280, 300, 220, 90, "Preview proxy", ["Cloudflare Worker", "checks access, wakes sandbox"])

box(575, 130, 285, 300, "API + agent workers", [
    "One TypeScript service",
    "(Cloud Run or Fly)",
    "",
    "REST + WebSocket to the browser",
    "Job queue: one job per agent run",
    "Agent loop: plan, act, verify, commit",
    "Model gateway module (AI SDK / LiteLLM)",
    "GitHub App + deploy clients",
    "Run state saved in Postgres",
], accent=True)

zone(575, 460, 285, 110, "DATA")
box(590, 488, 80, 64, "Postgres", ["Supabase"])
box(678, 488, 80, 64, "Redis", ["queue"])
box(766, 488, 80, 64, "Storage", ["S3 / R2"])

box(920, 130, 250, 170, "Sandbox provider (E2B)", [
    "Firecracker microVM per project",
    "dev server :3000, agents :8000",
    "the project's git repo",
    "pauses when idle, resumes in ~1s",
    "per-port preview URLs",
], accent=True)
box(920, 322, 250, 62, "LLM providers", ["Claude · GPT · Gemini · open-source"])
box(920, 402, 250, 56, "GitHub", ["repos, pull requests, webhooks"])

zone(1215, 100, 260, 300, "USER APPS (DEPLOYED)")
box(1230, 132, 230, 70, "Vercel / Cloudflare", ["front end of each app"])
box(1230, 215, 230, 70, "Fly Machines / Cloud Run", ["backend + agents, scale to zero"])
box(1230, 298, 230, 70, "Neon / Supabase", ["one Postgres per app"])

path("M230 185 H280"); num(255, 170, 1)
path("M500 185 H575"); label(526, 176, "REST + WS")
path("M860 205 H920"); num(890, 190, 2); label(866, 224, "exec, files")
path("M860 353 H920"); num(890, 338, 3)
path("M390 240 V300", color=BP, dashed=True); label(398, 276, "iframe")
path("M500 330 H518 V112 H1045 V130", color=BP); num(790, 112, 4)
path("M860 430 H920", color=INK2); num(890, 415, 5)
path("M860 418 H872 V612 H1300 V400"); num(1100, 612, 6)
path("M230 502 H250 V640 H1400 V400", color=BP); num(820, 640, 7)
path("M718 430 V488", dashed=True)

steps = [
    "1  Prompt goes from the browser to the API",
    "2  A worker picks up the run and starts a sandbox",
    "3  The agent loop calls models through one gateway",
    "4  The proxy streams the live dev server to the preview",
    "5  Each verified change is a commit, pushed to GitHub",
    "6  Publish builds the app and deploys it to hosting",
    "7  End users open the app at its own URL",
]
for i, s in enumerate(steps):
    out.append(f'<text x="920" y="{480 + i * 16}" class="s2">{esc(s)}</text>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{INK2}"/></marker>
  <style>
    .h {{ font-size: 22px; font-weight: 700; fill: {INK}; }}
    .zone {{ font-family: 'JetBrains Mono', Menlo, monospace; font-size: 10.5px; letter-spacing: 1.2px; fill: {BP}; font-weight: 600; }}
    .t {{ font-size: 14px; font-weight: 650; fill: {INK}; }}
    .s {{ font-size: 11.5px; fill: {INK2}; }}
    .s2 {{ font-size: 12px; fill: {INK}; }}
    .l {{ font-size: 10.5px; fill: {INK3}; }}
    .n {{ font-size: 11px; font-weight: 700; fill: #fff; }}
  </style>
</defs>
<rect width="{W}" height="{H}" fill="#ffffff"/>
{chr(10).join(out)}
</svg>
'''
root = Path(__file__).resolve().parent.parent
for p in [root / "docs" / "architecture-v1.svg", root / "public" / "architecture-v1.svg"]:
    p.write_text(svg)
print("ok")
