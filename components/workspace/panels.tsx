"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CircleCheck,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Plug,
  Plus,
  RotateCcw,
  Rocket,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { generateFiles } from "@/lib/codegen";
import { humanize, sampleValue } from "@/lib/sample";
import type { Deployment, GitState, Plan, SecretEntry } from "@/lib/types";
import { GitHubIcon } from "../icons";
import { Badge, Button, Field, Modal, Toggle, inputCls, timeAgo } from "../ui";

export type DrawerKey = "git" | "deploy" | "secrets" | "integrations" | "data" | "logs";

export function DrawerShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold">{title}</p>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1 text-ink-3 hover:bg-sunken hover:text-ink"><X className="size-4" /></button>
      </div>
      {subtitle && <p className="border-b border-line px-4 py-2 text-[12px] text-ink-3">{subtitle}</p>}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

/* ---------------------------------- Git ---------------------------------- */

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

export function GitPanel({
  plan,
  git,
  githubToken,
  userLogin,
  onChange,
  toast,
}: {
  plan: Plan;
  git: GitState | null;
  githubToken: string | null;
  userLogin: string;
  onChange: (g: GitState) => void;
  toast: (t: string, tone?: "ok" | "info" | "warn") => void;
}) {
  const [authorized, setAuthorized] = useState(Boolean(githubToken));
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState(plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const [priv, setPriv] = useState(true);
  const [progress, setProgress] = useState<string[] | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [prOpen, setPrOpen] = useState(false);

  const owner = githubToken ? userLogin : "acme";

  const create = async () => {
    const lines: string[] = [];
    const add = (l: string) => {
      lines.push(l);
      setProgress([...lines]);
    };
    add(`Creating ${owner}/${name} (${priv ? "private" : "public"})…`);
    let real = false;
    let repoFull = `${owner}/${name}`;
    if (githubToken) {
      try {
        const res = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
          body: JSON.stringify({ name, private: priv, description: plan.summary.slice(0, 300), auto_init: false }),
        });
        if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
        const repo = await res.json();
        repoFull = repo.full_name;
        real = true;
        add(`✓ Repository created on GitHub`);
        for (const f of generateFiles(plan)) {
          const r = await fetch(`https://api.github.com/repos/${repoFull}/contents/${f.path}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
            body: JSON.stringify({ message: `feat: add ${f.path}`, content: b64(f.content) }),
          });
          add(r.ok ? `  pushed ${f.path}` : `  ✗ ${f.path} (${r.status})`);
        }
      } catch (e) {
        add(`✗ GitHub said: ${(e as Error).message}. Falling back to a simulated repo.`);
      }
    }
    if (!real) {
      for (const f of ["Installing Architect GitHub App", "Initial commit a91c2e4 (14 files)", "Pushed main", "Created branch architect/session-1", "Registered webhook (push, pull_request)"]) {
        await new Promise((r) => setTimeout(r, 420));
        add(`✓ ${f}`);
      }
    }
    await new Promise((r) => setTimeout(r, 400));
    onChange({ repo: repoFull, branch: "architect/session-1", visibility: priv ? "private" : "public", prs: [], ahead: 0, lastPush: new Date().toISOString() });
    setProgress(null);
    toast(real ? `Pushed to github.com/${repoFull}` : `Connected ${repoFull}`);
  };

  if (!git) {
    if (progress) {
      return (
        <div className="rounded-lg bg-night p-3 font-mono text-[11.5px] leading-5 text-white/80">
          {progress.map((l, i) => <p key={i} className={l.includes("✗") ? "text-rose-300" : l.startsWith("✓") ? "text-emerald-300" : ""}>{l}</p>)}
          <p className="caret text-white/40" />
        </div>
      );
    }
    if (!authorized) {
      return (
        <div className="text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-ink text-white"><GitHubIcon className="size-5" /></span>
          <p className="mt-3 font-semibold">Back up and own your code</p>
          <p className="mt-1 text-[12.5px] text-ink-2">Every restore point becomes a commit. Developers can clone, review and open PRs. Nothing is locked in.</p>
          <Button variant="dark" className="mt-4 w-full" onClick={() => setAuthOpen(true)}><GitHubIcon className="size-4" /> Connect GitHub</Button>
          <ul className="mt-4 space-y-1.5 text-left text-[12px] text-ink-2">
            <li className="flex gap-2"><Check className="size-3.5 shrink-0 text-ok" /> Fine-grained access to only the repos you pick</li>
            <li className="flex gap-2"><Check className="size-3.5 shrink-0 text-ok" /> Architect works on branches and never force-pushes main</li>
            <li className="flex gap-2"><Check className="size-3.5 shrink-0 text-ok" /> Pushes from your laptop sync back here</li>
          </ul>
          <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Authorize Architect" subtitle="github.com/apps/architect-dev">
            <div className="space-y-3 text-[13px]">
              <p>Architect would like permission to:</p>
              <ul className="space-y-1.5 text-ink-2">
                <li>• Read and write code on selected repositories</li>
                <li>• Open and comment on pull requests</li>
                <li>• Receive push and pull request webhooks</li>
              </ul>
              <Field label="Install on">
                <select className={inputCls}><option>acme (organization)</option><option>your personal account</option></select>
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setAuthOpen(false)}>Cancel</Button>
                <Button variant="dark" onClick={() => { setAuthorized(true); setAuthOpen(false); toast("GitHub App installed on acme"); }}>Install & authorize</Button>
              </div>
              <p className="text-[11.5px] text-ink-3">Tip: sign in with GitHub to use your real account. Repos get created and pushed for real.</p>
            </div>
          </Modal>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {githubToken && <Badge tone="ok"><CircleCheck className="size-3" /> Signed in to GitHub as {userLogin}</Badge>}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1">
          {(["new", "existing"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={clsx("rounded-md py-1.5 text-[12.5px] font-medium", mode === m ? "bg-surface shadow-sm" : "text-ink-3")}>
              {m === "new" ? "Create new repo" : "Link existing"}
            </button>
          ))}
        </div>
        {mode === "new" ? (
          <>
            <Field label="Repository" hint={githubToken ? "This creates a real repo on your GitHub account and pushes the generated code." : undefined}>
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-ink-3">{owner}/</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-_.]/g, "-"))} />
              </div>
            </Field>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Private repository</span>
              <Toggle on={priv} onChange={setPriv} label="Private" />
            </div>
            <Button variant="primary" className="w-full" onClick={create} disabled={!name}>Create & push</Button>
          </>
        ) : (
          <div className="space-y-1.5">
            {["acme/support-agent", "acme/kyc-review", "acme/internal-tools"].map((r) => (
              <button key={r} onClick={() => onChange({ repo: r, branch: "architect/session-1", visibility: "private", prs: [], ahead: 0 })} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] hover:border-bp">
                <GitHubIcon className="size-3.5 text-ink-3" /> {r}
              </button>
            ))}
            <p className="text-[11.5px] text-ink-3">Linking an existing repo creates a new branch. Your main branch is untouched.</p>
          </div>
        )}
      </div>
    );
  }

  const push = async () => {
    setBusy("push");
    await new Promise((r) => setTimeout(r, 900));
    onChange({ ...git, ahead: 0, lastPush: new Date().toISOString() });
    setCommitMsg("");
    setBusy(null);
    toast(`Pushed to ${git.branch}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line p-3">
        <a href={`https://github.com/${git.repo}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13.5px] font-semibold hover:underline">
          <GitHubIcon className="size-4" /> {git.repo} <ExternalLink className="size-3 text-ink-3" />
        </a>
        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <GitBranch className="size-3.5 text-ink-3" />
          <select value={git.branch} onChange={(e) => onChange({ ...git, branch: e.target.value })} className="rounded border border-line bg-surface px-1 py-0.5 font-mono text-[11.5px] outline-none">
            {[git.branch, "main", "architect/session-1", "feature/retry-node"].filter((v, i, a) => a.indexOf(v) === i).map((b) => <option key={b}>{b}</option>)}
          </select>
          {git.ahead > 0 ? <Badge tone="warn">↑ {git.ahead} to push</Badge> : <Badge tone="ok">✓ In sync</Badge>}
        </div>
        {git.lastPush && <p className="mt-1.5 text-[11.5px] text-ink-3">Last push {timeAgo(git.lastPush)} · webhook active</p>}
      </div>

      <div>
        <p className="label-mono text-ink-3">Changes</p>
        {git.ahead === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-ink-2">Nothing new. Each change you make with the agent appears here as a commit.</p>
        ) : (
          <>
            <ul className="mt-1.5 space-y-1 font-mono text-[11.5px] text-ink-2">
              {Array.from({ length: git.ahead }).map((_, i) => (
                <li key={i} className="flex items-center gap-1.5"><span className="text-ok">M</span> {["app/page.tsx", "app/globals.css", "agents/workflow.py", "prompts/validator.md"][i % 4]}</li>
              ))}
            </ul>
            <textarea value={commitMsg || `feat: ${git.ahead} agent change${git.ahead > 1 ? "s" : ""} from Architect`} onChange={(e) => setCommitMsg(e.target.value)} rows={2} className="mt-2 w-full resize-none rounded-lg border border-line p-2 font-mono text-[12px] outline-none focus:border-bp" aria-label="Commit message" />
            <p className="-mt-0.5 text-[11px] text-ink-3">Commit message drafted by the agent.</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={push} loading={busy === "push"} disabled={git.ahead === 0}><ArrowUpFromLine className="size-3.5" /> Push</Button>
        <Button
          onClick={async () => {
            setBusy("pull");
            await new Promise((r) => setTimeout(r, 700));
            setBusy(null);
            toast("Already up to date with origin");
          }}
          loading={busy === "pull"}
        >
          <ArrowDownToLine className="size-3.5" /> Pull
        </Button>
        <Button variant="dark" className="col-span-2" onClick={() => setPrOpen(true)}><GitPullRequest className="size-3.5" /> Open pull request</Button>
      </div>

      {git.prs.length > 0 && (
        <div>
          <p className="label-mono text-ink-3">Pull requests</p>
          <ul className="mt-1.5 space-y-1.5">
            {git.prs.map((pr) => (
              <li key={pr.number} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[12.5px]">
                <GitPullRequest className={clsx("size-3.5", pr.status === "merged" ? "text-purple-600" : "text-ok")} />
                <span className="flex-1 truncate">{pr.title}</span>
                <span className="font-mono text-[11px] text-ink-3">#{pr.number}</span>
                {pr.status === "open" ? (
                  <button onClick={() => onChange({ ...git, prs: git.prs.map((p) => (p.number === pr.number ? { ...p, status: "merged" } : p)) })} className="text-[11.5px] font-medium text-bp hover:underline">Merge</button>
                ) : (
                  <Badge>merged</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PrModal
        open={prOpen}
        onClose={() => setPrOpen(false)}
        git={git}
        plan={plan}
        onCreate={(title) => {
          const number = 12 + git.prs.length;
          onChange({ ...git, ahead: 0, prs: [{ number, title, status: "open" }, ...git.prs] });
          setPrOpen(false);
          toast(`Opened PR #${number} · CI running`);
        }}
      />
    </div>
  );
}

function PrModal({ open, onClose, git, plan, onCreate }: { open: boolean; onClose: () => void; git: GitState; plan: Plan; onCreate: (t: string) => void }) {
  const [title, setTitle] = useState(`feat: ${plan.name} agent workflow and UI`);
  const body = `## What\n${plan.summary}\n\n## Changes\n${plan.pages.map((p) => `- ${p.name} page`).join("\n")}\n${plan.agents.map((a) => `- ${a.name} agent (${a.model})`).join("\n")}\n\n## Verification\n- ✅ typecheck, 12 unit tests, visual check\n- ✅ evals 4/5 (80%)\n\n_Opened from Architect_`;
  return (
    <Modal open={open} onClose={onClose} title="Open a pull request" subtitle={`${git.branch} → main · ${git.repo}`} width="max-w-xl">
      <div className="space-y-3">
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description (written by the agent)">
          <textarea defaultValue={body} rows={11} className="w-full resize-none rounded-lg border border-line p-2.5 font-mono text-[12px] leading-5 outline-none focus:border-bp" />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-3">Reviewers: auto-assigned from CODEOWNERS</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="dark" onClick={() => onCreate(title)}><GitPullRequest className="size-3.5" /> Create PR</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------- Secrets -------------------------------- */

export function SecretsPanel({ plan, secrets, onChange, toast }: { plan: Plan; secrets: SecretEntry[]; onChange: (s: SecretEntry[]) => void; toast: (t: string) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [useCredits, setUseCredits] = useState(true);
  const missing = plan.secrets.filter((s) => !secrets.some((x) => x.key === s));

  const save = async (k = key) => {
    if (!k || !value) return;
    setChecking(true);
    await new Promise((r) => setTimeout(r, 800));
    onChange([...secrets.filter((s) => s.key !== k), { key: k, last4: value.slice(-4), addedAt: new Date().toISOString() }]);
    setChecking(false);
    setKey("");
    setValue("");
    toast(`${k} saved to vault`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line p-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium">LLM access</span>
          <Toggle on={useCredits} onChange={setUseCredits} label="Use Architect credits" />
        </div>
        <p className="mt-1 text-[12px] text-ink-2">{useCredits ? "Your agents use Architect credits. No API keys needed." : "Bring your own keys: add ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY below."}</p>
      </div>

      {missing.length > 0 && (
        <div>
          <p className="label-mono text-warn">Needed by your app</p>
          <div className="mt-2 space-y-2">
            {missing.map((m) => (
              <div key={m} className="rounded-lg border border-warn/30 bg-warn-50 p-2.5">
                <p className="font-mono text-[12px] font-medium">{m}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <input type="password" placeholder="Paste value" className={inputCls + " h-8 font-mono text-[12px]"} onChange={(e) => { setKey(m); setValue(e.target.value); }} value={key === m ? value : ""} />
                  <Button size="sm" variant="primary" onClick={() => save(m)} loading={checking && key === m} disabled={key !== m || !value}>Save</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-mono text-ink-3">Vault</p>
        {secrets.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-ink-2">No secrets yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {secrets.map((s) => (
              <li key={s.key} className="flex items-center gap-2 px-3 py-2">
                <KeyRound className="size-3.5 text-ink-3" />
                <span className="flex-1 truncate font-mono text-[12px]">{s.key}</span>
                <span className="font-mono text-[11.5px] text-ink-3">••••{s.last4}</span>
                <button aria-label={`Delete ${s.key}`} onClick={() => onChange(secrets.filter((x) => x.key !== s.key))} className="rounded p-1 text-ink-3 hover:text-bad"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="label-mono text-ink-3">Add secret</p>
        <input className={inputCls + " font-mono text-[12.5px]"} placeholder="KEY_NAME" value={missing.includes(key) ? "" : key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} />
        <input className={inputCls + " font-mono text-[12.5px]"} type="password" placeholder="value" value={missing.includes(key) ? "" : value} onChange={(e) => setValue(e.target.value)} />
        <Button className="w-full" onClick={() => save()} loading={checking && !missing.includes(key)} disabled={!key || !value || missing.includes(key)}><Plus className="size-3.5" /> Add to vault</Button>
        <p className="text-[11.5px] leading-snug text-ink-3">Encrypted with a per-workspace KMS key. Injected at runtime by the egress proxy and never written to your repo, logs, or the chat. Only the last 4 characters are stored here.</p>
      </div>
    </div>
  );
}

/* ------------------------------ Integrations ----------------------------- */

const CATALOG = [
  { name: "Slack", cat: "Messaging", color: "#4A154B" },
  { name: "Gmail", cat: "Email", color: "#EA4335" },
  { name: "Google Sheets", cat: "Data", color: "#0F9D58" },
  { name: "Google Drive", cat: "Files", color: "#1FA463" },
  { name: "Google Calendar", cat: "Scheduling", color: "#4285F4" },
  { name: "Notion", cat: "Docs", color: "#111111" },
  { name: "HubSpot", cat: "CRM", color: "#FF7A59" },
  { name: "Zendesk", cat: "Support", color: "#03363D" },
  { name: "Stripe", cat: "Payments", color: "#635BFF" },
  { name: "Supabase", cat: "Database", color: "#3ECF8E" },
  { name: "QuickBooks", cat: "Finance", color: "#2CA01C" },
  { name: "PagerDuty", cat: "On-call", color: "#06AC38" },
];

export function IntegrationsPanel({ plan, connected, onChange, toast }: { plan: Plan; connected: string[]; onChange: (c: string[]) => void; toast: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [oauth, setOauth] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState("");
  const list = CATALOG.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(plan.integrations.includes(b.name)) - Number(plan.integrations.includes(a.name)));
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-ink-3" />
        <input className={inputCls + " pl-8"} placeholder="Search 120+ integrations" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="space-y-1.5">
        {list.map((c) => {
          const on = connected.includes(c.name);
          const needed = plan.integrations.includes(c.name);
          return (
            <li key={c.name} className={clsx("flex items-center gap-2.5 rounded-lg border px-2.5 py-2", needed && !on ? "border-bp-100 bg-bp-50/50" : "border-line")}>
              <span className="grid size-7 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{c.name}</span>
                <span className="block text-[11px] text-ink-3">{needed ? "Needed by your plan" : c.cat}</span>
              </span>
              {on ? (
                <button onClick={() => onChange(connected.filter((x) => x !== c.name))} className="flex items-center gap-1 text-[12px] font-medium text-ok hover:text-bad"><Check className="size-3.5" /> Connected</button>
              ) : (
                <Button size="sm" variant={needed ? "primary" : "secondary"} onClick={() => setOauth(c.name)}>Connect</Button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="rounded-lg border border-dashed border-line-strong p-3">
        <p className="flex items-center gap-1.5 text-[13px] font-medium"><Plug className="size-3.5" /> Custom MCP server</p>
        <p className="mt-0.5 text-[12px] text-ink-2">Give your agents any tool that speaks the Model Context Protocol.</p>
        <div className="mt-2 flex gap-1.5">
          <input className={inputCls + " h-8 text-[12px]"} placeholder="https://mcp.yourco.com/sse" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} />
          <Button size="sm" disabled={!/^https?:\/\//.test(mcpUrl)} onClick={() => { onChange([...connected, `MCP: ${new URL(mcpUrl).host}`]); setMcpUrl(""); toast("MCP server added · 6 tools discovered"); }}>Add</Button>
        </div>
        {connected.filter((c) => c.startsWith("MCP:")).map((c) => <p key={c} className="mt-1.5 font-mono text-[11.5px] text-ok">✓ {c}</p>)}
      </div>
      <Modal open={Boolean(oauth)} onClose={() => setOauth(null)} title={`Connect ${oauth}`} subtitle="You'll be redirected to sign in and approve access.">
        <div className="space-y-3 text-[13px]">
          <p>Architect will be able to:</p>
          <ul className="space-y-1 text-ink-2">
            <li>• Read and send messages / records your agents need</li>
            <li>• Act only within the channels or objects you choose</li>
          </ul>
          <p className="rounded-md bg-sunken px-2.5 py-2 text-[12px] text-ink-2">Tokens are stored in the vault and scoped to this project. Revoke any time.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOauth(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { onChange([...new Set([...connected, oauth!])]); toast(`${oauth} connected`); setOauth(null); }}>Continue to {oauth}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------------- Data --------------------------------- */

export function DataPanel({ plan }: { plan: Plan }) {
  const ent = plan.data[0];
  const [tab, setTab] = useState<"rows" | "schema" | "sql">("rows");
  const [sql, setSql] = useState(`select * from ${ent.entity.toLowerCase()}s limit 5;`);
  const [ran, setRan] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-ink-3" />
        <span className="text-[13px] font-semibold">{ent.entity.toLowerCase()}s</span>
        <Badge tone="bp">branch: preview</Badge>
        <span className="ml-auto text-[11.5px] text-ink-3">24 rows</span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1">
        {(["rows", "schema", "sql"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("rounded-md py-1 text-[12px] font-medium capitalize", tab === t ? "bg-surface shadow-sm" : "text-ink-3")}>{t === "sql" ? "SQL" : t}</button>
        ))}
      </div>
      {tab === "schema" && (
        <ul className="divide-y divide-line rounded-lg border border-line font-mono text-[12px]">
          <li className="flex justify-between px-3 py-1.5"><span>id</span><span className="text-ink-3">uuid · pk</span></li>
          {ent.fields.map((f) => (
            <li key={f} className="flex justify-between px-3 py-1.5"><span>{f}</span><span className="text-ink-3">{/_at$|date/.test(f) ? "timestamptz" : /score|amount|tokens|sources/.test(f) ? "numeric" : "text"}</span></li>
          ))}
        </ul>
      )}
      {(tab === "rows" || (tab === "sql" && ran)) && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[11.5px]">
            <thead><tr className="border-b border-line bg-paper">{ent.fields.slice(0, 3).map((f) => <th key={f} className="px-2 py-1.5 font-medium">{humanize(f)}</th>)}</tr></thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((r) => (
                <tr key={r} className="border-b border-line last:border-0">{ent.fields.slice(0, 3).map((f) => <td key={f} className="px-2 py-1.5">{sampleValue(f, r)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "sql" && (
        <div className="space-y-2">
          <textarea value={sql} onChange={(e) => setSql(e.target.value)} rows={3} spellCheck={false} className="w-full resize-none rounded-lg border border-night-line bg-night p-2.5 font-mono text-[12px] text-white/85 outline-none" />
          <Button size="sm" variant="dark" onClick={() => setRan(true)}>Run query</Button>
          {ran && <p className="text-[11.5px] text-ink-3">5 rows · 3.1ms · read-only role on the preview branch</p>}
        </div>
      )}
      <p className="text-[11.5px] leading-snug text-ink-3">Every preview environment gets its own copy-on-write database branch, so testing never touches production data.</p>
    </div>
  );
}

/* ---------------------------------- Logs --------------------------------- */

export function LogsPanel({ logs }: { logs: string[] }) {
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const shown = useMemo(() => logs.filter((l) => filter === "all" || /✗|error|warn/i.test(l)), [logs, filter]);
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(["all", "errors"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={clsx("rounded-md px-2 py-1 text-[12px] font-medium capitalize", filter === f ? "bg-sunken" : "text-ink-3")}>{f}</button>
        ))}
      </div>
      <div className="rounded-lg bg-night p-2.5 font-mono text-[11px] leading-5 text-white/70">
        {shown.length === 0 ? <p className="text-white/40">No logs.</p> : shown.map((l, i) => <p key={i} className={/✗|error/i.test(l) ? "text-rose-300" : l.includes("✓") ? "text-emerald-300" : ""}>{l}</p>)}
      </div>
    </div>
  );
}

/* --------------------------------- Deploy -------------------------------- */

export function DeployPanel({ deployments, onDeploy, onRollback, built }: { deployments: Deployment[]; onDeploy: () => void; onRollback: (id: string) => void; built: boolean }) {
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const live = deployments.find((d) => d.status === "live" && d.env === "production");
  return (
    <div className="space-y-5">
      {live ? (
        <div className="rounded-lg border border-ok/30 bg-ok-50 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-ok"><span className="size-1.5 rounded-full bg-ok" /> Production is live</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <a href={live.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:underline">{live.url.replace(/^https?:\/\//, "")}</a>
            <button aria-label="Copy URL" onClick={() => { navigator.clipboard?.writeText(live.url).catch(() => {}); setCopied(live.id); setTimeout(() => setCopied(null), 1500); }} className="rounded p-1 hover:bg-white">
              {copied === live.id ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong p-4 text-center">
          <Rocket className="mx-auto size-5 text-ink-3" />
          <p className="mt-2 text-[13px] font-medium">Not deployed yet</p>
          <p className="mt-0.5 text-[12px] text-ink-2">Checks run before anything goes live.</p>
        </div>
      )}
      <Button variant="primary" className="w-full" disabled={!built} onClick={onDeploy}><Rocket className="size-3.5" /> {live ? "Deploy latest changes" : "Deploy"}</Button>

      <div>
        <p className="label-mono text-ink-3">Custom domain</p>
        <div className="mt-1.5 flex gap-1.5">
          <input className={inputCls + " h-8 text-[12.5px]"} placeholder="app.yourcompany.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <Button size="sm" disabled={!domain.includes(".")}>Add</Button>
        </div>
        {domain.includes(".") && <p className="mt-1.5 font-mono text-[11px] text-ink-3">CNAME {domain} → edge.architect.app · TLS via ACME</p>}
      </div>

      <div>
        <p className="label-mono text-ink-3">History</p>
        {deployments.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-ink-2">Each deploy is an immutable build. Roll back to any of them in one click.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {[...deployments].reverse().map((d) => (
              <li key={d.id} className="rounded-lg border border-line px-2.5 py-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <Globe className={clsx("size-3.5", d.status === "live" ? "text-ok" : "text-ink-3")} />
                  <Badge tone={d.env === "production" ? "ok" : "bp"}>{d.env}</Badge>
                  <span className="font-mono text-ink-3">{d.commit}</span>
                  <span className="ml-auto text-ink-3">{timeAgo(d.at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-ink-2">{d.target}</span>
                  {d.status === "live" ? <span className="ml-auto text-[11px] font-medium text-ok">Current</span> : (
                    <button onClick={() => onRollback(d.id)} className="ml-auto flex items-center gap-1 text-[11.5px] font-medium text-bp hover:underline"><RotateCcw className="size-3" /> Roll back</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

