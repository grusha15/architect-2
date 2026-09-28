"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleCheck, FileCode2, KeyRound, Loader2, Lock, Search, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GitHubIcon } from "@/components/icons";
import { Badge, Button, inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fallbackPlan } from "@/lib/planner";
import { createProject, uid, updateProject } from "@/lib/store";
import type { Framework } from "@/lib/types";

interface Repo {
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string;
  stargazers_count: number;
  default_branch: string;
}

const DEMO_REPOS: Repo[] = [
  { full_name: "acme/support-agent", description: "LangGraph support triage agent with FastAPI + Next.js dashboard", private: true, language: "Python", updated_at: new Date(Date.now() - 36e5 * 5).toISOString(), stargazers_count: 12, default_branch: "main" },
  { full_name: "acme/kyc-review", description: "Document review workflow for compliance", private: true, language: "TypeScript", updated_at: new Date(Date.now() - 864e5 * 2).toISOString(), stargazers_count: 4, default_branch: "main" },
  { full_name: "acme/research-crew", description: "CrewAI research crew that writes weekly competitor briefings", private: false, language: "Python", updated_at: new Date(Date.now() - 864e5 * 6).toISOString(), stargazers_count: 88, default_branch: "main" },
  { full_name: "acme/marketing-site", description: "Next.js marketing website", private: false, language: "TypeScript", updated_at: new Date(Date.now() - 864e5 * 20).toISOString(), stargazers_count: 3, default_branch: "main" },
];

type Stage = "connect" | "pick" | "detect" | "env" | "boot";

export default function ImportPage() {
  return (
    <AppShell>
      <Import />
    </AppShell>
  );
}

function detectFw(r: Repo): Framework {
  const s = `${r.full_name} ${r.description ?? ""}`.toLowerCase();
  if (s.includes("crew")) return "crewai";
  if (s.includes("langgraph") || s.includes("langchain")) return "langgraph";
  if (s.includes("openai")) return "openai-agents";
  if (s.includes("claude") || r.language === "TypeScript") return "claude-agent-sdk";
  return "langgraph";
}

function Import() {
  const { githubToken } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("connect");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [realGithub, setRealGithub] = useState(false);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState<Repo | null>(null);
  const [detectLines, setDetectLines] = useState<string[]>([]);
  const [toml, setToml] = useState("");
  const [env, setEnv] = useState<Record<string, string>>({ OPENAI_API_KEY: "", DATABASE_URL: "", SLACK_BOT_TOKEN: "" });
  const [bootLines, setBootLines] = useState<string[]>([]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    if (githubToken) {
      try {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", { headers: { Authorization: `Bearer ${githubToken}` } });
        if (res.ok) {
          setRepos((await res.json()) as Repo[]);
          setRealGithub(true);
          setLoadingRepos(false);
          setStage("pick");
          return;
        }
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 900));
    setRepos(DEMO_REPOS);
    setLoadingRepos(false);
    setStage("pick");
  };

  useEffect(() => {
    if (githubToken) loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubToken]);

  const choose = (r: Repo) => {
    setRepo(r);
    setStage("detect");
    const fw = detectFw(r);
    const lines = [
      `git clone --depth 1 https://github.com/${r.full_name}.git`,
      "Receiving objects: 100% (1,284/1,284), 2.1 MiB",
      r.language === "Python" ? "Found pyproject.toml → Python 3.12, uv" : "Found package.json → Node 22, pnpm",
      "Found web/package.json → Next.js 15 (App Router)",
      `Found imports → ${fw} agents in /agents`,
      "Found .env.example → 3 variables",
      "Found tests → pytest (14), vitest (22)",
    ];
    setDetectLines([]);
    lines.forEach((l, i) => setTimeout(() => setDetectLines((s) => [...s, l]), 350 * (i + 1)));
    setToml(
      `[project]\nname = "${r.full_name.split("/")[1]}"\nframework = "${fw}"\n\n[dev]\ninstall = "pnpm install && uv sync"\ncommand = "pnpm --dir web dev & uvicorn api.main:app --reload"\nport = 3000\n\n[test]\ncommand = "pytest -q && pnpm --dir web test"\n`,
    );
  };

  const boot = async () => {
    if (!repo) return;
    setStage("boot");
    const lines = ["Claiming sandbox from warm pool… sbx_91c ready (184ms)", "pnpm install — 612 packages (cache hit)", "uv sync — 38 packages", "Injecting secrets from vault (3)", "Starting dev server on :3000", "✓ Preview ready"];
    for (let i = 0; i < lines.length; i++) {
      await new Promise((r) => setTimeout(r, 520));
      setBootLines((s) => [...s, lines[i]]);
    }
    const fw = detectFw(repo);
    const prompt = repo.description ?? repo.full_name;
    const plan = fallbackPlan(prompt, {}, fw);
    plan.name = repo.full_name.split("/")[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const now = new Date().toISOString();
    const project = await createProject(plan.name, { prompt, source: "import", importedFrom: { repo: repo.full_name, stack: `${repo.language ?? "Mixed"} · ${fw}` } });
    await updateProject(project.id, {
      status: "ready",
      data: {
        ...project.data,
        prompt,
        source: "import",
        plan,
        built: true,
        importedFrom: { repo: repo.full_name, stack: `${repo.language ?? "Mixed"} · ${fw}` },
        git: { repo: repo.full_name, branch: "architect/import", visibility: repo.private ? "private" : "public", prs: [], ahead: 0, lastPush: now },
        secrets: Object.entries(env)
          .filter(([, v]) => v)
          .map(([k, v]) => ({ key: k, last4: v.slice(-4), addedAt: now })),
        checkpoints: [{ id: uid(), title: `Imported ${repo.full_name}@${repo.default_branch}`, detail: "Baseline from GitHub", at: now, files: 142, preview: project.data.preview }],
        messages: [
          { id: uid(), role: "agent", at: now, text: `I imported **${repo.full_name}** and it's running. I found a ${fw} agent workflow, a FastAPI backend and a Next.js front end. I'm on branch \`architect/import\` — nothing goes to \`${repo.default_branch}\` without a PR. What should we work on?` },
        ],
      },
    });
    router.push(`/p/${project.id}?view=code`);
  };

  const filtered = useMemo(() => repos.filter((r) => r.full_name.toLowerCase().includes(q.toLowerCase())), [repos, q]);
  const stepIndex = { connect: 0, pick: 0, detect: 1, env: 2, boot: 3 }[stage];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <p className="label-mono text-bp">Import</p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Continue an existing project in Architect</h1>
      <p className="mt-1 text-[14px] text-ink-2">We clone it into a private sandbox, work out how to run it, and keep every change on a branch in your repo.</p>

      <ol className="mt-8 flex items-center gap-2 text-[12.5px]">
        {["Choose repo", "Detect stack", "Secrets", "Boot"].map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={clsx("grid size-5 place-items-center rounded-full text-[11px] font-semibold", i < stepIndex ? "bg-ok text-white" : i === stepIndex ? "bg-bp text-white" : "bg-sunken text-ink-3")}>
              {i < stepIndex ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={i === stepIndex ? "font-medium" : "text-ink-3"}>{s}</span>
            {i < 3 && <span className="h-px w-6 bg-line-strong sm:w-12" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-line bg-surface">
        {stage === "connect" && (
          <div className="p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-ink text-white"><GitHubIcon className="size-6" /></span>
            <h2 className="mt-4 text-[17px] font-semibold">Connect GitHub</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-ink-2">Install the Architect GitHub App on the repos you choose. We use short-lived tokens and only request what we need.</p>
            <Button variant="dark" size="lg" className="mt-5" onClick={loadRepos} loading={loadingRepos}>
              <GitHubIcon className="size-4" /> Install GitHub App
            </Button>
            <div className="mx-auto mt-8 max-w-md">
              <div className="flex items-center gap-3 text-[12px] text-ink-3"><span className="h-px flex-1 bg-line" /> or a public repo URL <span className="h-px flex-1 bg-line" /></div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const m = url.match(/github\.com\/([^/\s]+\/[^/\s#?]+)/);
                  if (m) choose({ full_name: m[1].replace(/\.git$/, ""), description: "Imported public repository", private: false, language: "Python", updated_at: new Date().toISOString(), stargazers_count: 0, default_branch: "main" });
                }}
              >
                <input className={inputCls} placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Public repo URL" />
                <Button type="submit">Import</Button>
              </form>
            </div>
          </div>
        )}

        {stage === "pick" && (
          <div>
            <div className="flex items-center gap-2 border-b border-line p-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-ink-3" />
                <input autoFocus className={inputCls + " pl-8"} placeholder="Search repositories" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Badge tone={realGithub ? "ok" : "neutral"}>{realGithub ? "Live from GitHub" : "Demo org"}</Badge>
            </div>
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {filtered.map((r) => (
                <li key={r.full_name}>
                  <button onClick={() => choose(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                    <GitHubIcon className="size-4 text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[14px] font-medium">
                        {r.full_name} {r.private && <Lock className="size-3 text-ink-3" />}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-3">{r.description ?? "No description"}</span>
                    </span>
                    {r.language && <span className="text-[12px] text-ink-3">{r.language}</span>}
                    <span className="flex items-center gap-0.5 text-[12px] text-ink-3"><Star className="size-3" />{r.stargazers_count}</span>
                    <ArrowRight className="size-4 text-ink-3" />
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="p-6 text-center text-[13px] text-ink-3">No repositories match.</li>}
            </ul>
          </div>
        )}

        {stage === "detect" && repo && (
          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-line p-5 md:border-b-0 md:border-r">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold"><GitHubIcon className="size-4" /> {repo.full_name}</h2>
              <div className="mt-4 space-y-1.5 font-mono text-[12px]">
                {detectLines.map((l) => (
                  <p key={l} className="anim-rise flex gap-2 text-ink-2"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />{l}</p>
                ))}
                {detectLines.length < 7 && <p className="flex items-center gap-2 text-ink-3"><Loader2 className="size-3.5 animate-spin" /> scanning…</p>}
              </div>
            </div>
            <div className="p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold"><FileCode2 className="size-4" /> Proposed architect.toml</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">This is how we&apos;ll run it. Edit if we got something wrong.</p>
              <textarea value={toml} onChange={(e) => setToml(e.target.value)} spellCheck={false} className="mt-3 h-56 w-full resize-none rounded-lg border border-night-line bg-night p-3 font-mono text-[12px] leading-5 text-white/85 outline-none focus:border-bp" />
              <div className="mt-3 flex justify-end">
                <Button variant="primary" disabled={detectLines.length < 7} onClick={() => setStage("env")}>
                  Looks right <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {stage === "env" && (
          <div className="p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold"><KeyRound className="size-4" /> Your app needs 3 secrets</h2>
            <p className="mt-1 text-[13px] text-ink-2">Found in <code className="font-mono">.env.example</code>. Values are encrypted in the vault and injected at runtime — they never land in your repo or the chat.</p>
            <div className="mt-4 space-y-2.5">
              {Object.keys(env).map((k) => (
                <div key={k} className="grid items-center gap-2 sm:grid-cols-[200px_1fr]">
                  <code className="font-mono text-[12.5px]">{k}</code>
                  <input type="password" className={inputCls + " font-mono"} placeholder={k === "DATABASE_URL" ? "postgres://… (or leave empty for a managed DB)" : "sk-…"} value={env[k]} onChange={(e) => setEnv({ ...env, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStage("detect")}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={boot}>Skip for now</Button>
                <Button variant="primary" onClick={boot}>Save & boot <ArrowRight className="size-4" /></Button>
              </div>
            </div>
          </div>
        )}

        {stage === "boot" && (
          <div className="p-5">
            <h2 className="text-[15px] font-semibold">Booting {repo?.full_name}</h2>
            <div className="mt-4 rounded-lg bg-night p-4 font-mono text-[12px] leading-6 text-white/80">
              {bootLines.map((l) => <p key={l} className="anim-rise">{l.startsWith("✓") ? <span className="text-emerald-400">{l}</span> : <>$ {l}</>}</p>)}
              <p className="caret text-white/40" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
