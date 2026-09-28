"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileCode2, FileText, Folder, GitCompare, Loader2, SquareTerminal, X } from "lucide-react";
import { generateFiles, type GenFile } from "@/lib/codegen";
import type { Checkpoint, Plan } from "@/lib/types";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[12px] text-white/40">
      <Loader2 className="size-4 animate-spin" />
    </div>
  ),
});

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function buildTree(files: GenFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let level = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path, children: i < parts.length - 1 ? [] : undefined };
        level.push(node);
      }
      if (node.children) level = node.children;
    });
  }
  const sort = (n: TreeNode[]): TreeNode[] =>
    n.sort((a, b) => (a.children && !b.children ? -1 : !a.children && b.children ? 1 : a.name.localeCompare(b.name))).map((x) => (x.children ? { ...x, children: sort(x.children) } : x));
  return sort(root);
}

export function CodeLens({ plan, checkpoints, gitBranch, onAcceptAll }: { plan: Plan; checkpoints: Checkpoint[]; gitBranch?: string; onAcceptAll: () => void }) {
  const files = useMemo(() => generateFiles(plan), [plan]);
  const tree = useMemo(() => buildTree(files), [files]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string[]>(() => [files.find((f) => f.path.startsWith("agents/"))?.path ?? files[0].path]);
  const [active, setActive] = useState(open[0]);
  const [tab, setTab] = useState<"editor" | "changes">("editor");
  const [termOpen, setTermOpen] = useState(true);

  useEffect(() => {
    // Framework switches rename the entry file; keep the editor pointed at something real.
    if (!files.some((f) => f.path === active)) {
      const next = files.find((f) => f.path.startsWith("agents/"))?.path ?? files[0].path;
      setActive(next);
      setOpen((o) => [...o.filter((p) => files.some((f) => f.path === p)), next]);
    }
  }, [files, active]);

  const file = files.find((f) => f.path === active) ?? files[0];
  const openFile = (path: string) => {
    setOpen((o) => (o.includes(path) ? o : [...o, path]));
    setActive(path);
    setTab("editor");
  };

  return (
    <div className="flex h-full min-h-0 bg-night text-white">
      {/* Explorer */}
      <aside className="scroll-night hidden w-56 shrink-0 overflow-y-auto border-r border-night-line py-2 sm:block">
        <p className="label-mono px-3 pb-2 text-white/40">Explorer</p>
        <Tree nodes={tree} active={active} onOpen={openFile} depth={0} edited={edits} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Tabs */}
        <div className="flex h-9 shrink-0 items-stretch border-b border-night-line bg-night-2 text-[12px]">
          <button onClick={() => setTab("changes")} className={clsx("flex items-center gap-1.5 border-r border-night-line px-3", tab === "changes" ? "bg-night text-white" : "text-white/50 hover:text-white")}>
            <GitCompare className="size-3.5" /> Changes <span className="rounded bg-[#2747d6] px-1 text-[10px]">{checkpoints.length}</span>
          </button>
          <div className="scroll-night flex min-w-0 flex-1 overflow-x-auto">
            {open.map((p) => (
              <div key={p} className={clsx("group flex shrink-0 items-center gap-1.5 border-r border-night-line pl-3 pr-1.5", tab === "editor" && active === p ? "bg-night text-white" : "text-white/50")}>
                <button onClick={() => { setActive(p); setTab("editor"); }} className="flex items-center gap-1.5">
                  <FileIcon path={p} />
                  {p.split("/").pop()}
                  {edits[p] !== undefined && <span className="size-1.5 rounded-full bg-white/70" />}
                </button>
                <button
                  aria-label={`Close ${p}`}
                  onClick={() => {
                    const rest = open.filter((x) => x !== p);
                    setOpen(rest.length ? rest : [files[0].path]);
                    if (active === p) setActive(rest[0] ?? files[0].path);
                  }}
                  className="rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <span className="hidden items-center px-3 font-mono text-[11px] text-white/40 md:flex">⎇ {gitBranch ?? "main"}</span>
        </div>

        <div className="min-h-0 flex-1">
          {tab === "editor" ? (
            <Monaco
              height="100%"
              theme="vs-dark"
              path={file.path}
              language={file.language === "ini" ? "ini" : file.language}
              value={edits[file.path] ?? file.content}
              onChange={(v) => setEdits((e) => ({ ...e, [file.path]: v ?? "" }))}
              options={{ fontSize: 12.5, minimap: { enabled: false }, scrollBeyondLastLine: false, fontFamily: "var(--font-jetbrains), Menlo, monospace", padding: { top: 12 }, renderLineHighlight: "gutter" }}
            />
          ) : (
            <Changes files={files} checkpoints={checkpoints} onAcceptAll={onAcceptAll} onOpen={openFile} />
          )}
        </div>

        {/* Terminal */}
        <div className="shrink-0 border-t border-night-line">
          <button onClick={() => setTermOpen((v) => !v)} className="flex h-8 w-full items-center gap-2 bg-night-2 px-3 text-[11.5px] text-white/60 hover:text-white">
            <SquareTerminal className="size-3.5" /> Terminal <span className="font-mono text-white/35">sbx_7f3a · bash</span>
            {termOpen ? <ChevronDown className="ml-auto size-3.5" /> : <ChevronRight className="ml-auto size-3.5" />}
          </button>
          {termOpen && <Terminal plan={plan} files={files} branch={gitBranch} />}
        </div>
      </div>
    </div>
  );
}

function Tree({ nodes, active, onOpen, depth, edited }: { nodes: TreeNode[]; active: string; onOpen: (p: string) => void; depth: number; edited: Record<string, string> }) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  return (
    <ul>
      {nodes.map((n) =>
        n.children ? (
          <li key={n.path}>
            <button
              onClick={() => setClosed((s) => { const x = new Set(s); if (x.has(n.path)) x.delete(n.path); else x.add(n.path); return x; })}
              className="flex w-full items-center gap-1 py-[3px] pr-2 text-left text-[12.5px] text-white/70 hover:bg-white/5"
              style={{ paddingLeft: 10 + depth * 12 }}
            >
              {closed.has(n.path) ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              <Folder className="size-3.5 text-[#8ea0ff]" /> {n.name}
            </button>
            {!closed.has(n.path) && <Tree nodes={n.children} active={active} onOpen={onOpen} depth={depth + 1} edited={edited} />}
          </li>
        ) : (
          <li key={n.path}>
            <button
              onClick={() => onOpen(n.path)}
              className={clsx("flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[12.5px]", active === n.path ? "bg-[#2747d6]/30 text-white" : "text-white/65 hover:bg-white/5")}
              style={{ paddingLeft: 24 + depth * 12 }}
            >
              <FileIcon path={n.path} /> <span className="truncate">{n.name}</span>
              {edited[n.path] !== undefined && <span className="ml-auto text-[10px] text-amber-300">M</span>}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function FileIcon({ path }: { path: string }) {
  if (path.endsWith(".md")) return <FileText className="size-3.5 shrink-0 text-white/50" />;
  const color = path.endsWith(".py") ? "text-[#f7c948]" : path.endsWith(".tsx") || path.endsWith(".ts") ? "text-[#4fc1ff]" : path.endsWith(".json") ? "text-[#c3e88d]" : "text-white/50";
  return <FileCode2 className={clsx("size-3.5 shrink-0", color)} />;
}

function Changes({ files, checkpoints, onAcceptAll, onOpen }: { files: GenFile[]; checkpoints: Checkpoint[]; onAcceptAll: () => void; onOpen: (p: string) => void }) {
  const latest = checkpoints[checkpoints.length - 1];
  const changed = files.filter((f) => f.path.startsWith("agents/") || f.path === "app/page.tsx" || f.path === "agent.manifest.json").slice(0, 3);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  return (
    <div className="scroll-night h-full overflow-y-auto p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-semibold">{latest ? latest.title : "No changes yet"}</p>
        {latest && <span className="font-mono text-[11px] text-white/40">{latest.files} files · {new Date(latest.at).toLocaleTimeString()}</span>}
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setAccepted(new Set())} className="rounded-md border border-night-line px-2 py-1 text-[12px] text-white/70 hover:border-rose-400 hover:text-rose-300">Reject all</button>
          <button
            onClick={() => {
              setAccepted(new Set(changed.map((c) => c.path)));
              onAcceptAll();
            }}
            className="rounded-md bg-[#2747d6] px-2 py-1 text-[12px] font-medium hover:bg-[#1f3bb8]"
          >
            Accept all
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {changed.map((f) => {
          const lines = f.content.split("\n").slice(0, 14);
          return (
            <div key={f.path} className="overflow-hidden rounded-lg border border-night-line">
              <div className="flex items-center gap-2 bg-night-2 px-3 py-1.5 text-[12px]">
                <FileIcon path={f.path} />
                <button onClick={() => onOpen(f.path)} className="font-mono hover:underline">{f.path}</button>
                <span className="font-mono text-emerald-400">+{lines.length}</span>
                <span className="font-mono text-rose-400">−{Math.max(1, Math.floor(lines.length / 5))}</span>
                {accepted.has(f.path) ? (
                  <span className="ml-auto flex items-center gap-1 text-emerald-400"><Check className="size-3" /> Accepted</span>
                ) : (
                  <button onClick={() => setAccepted((s) => new Set([...s, f.path]))} className="ml-auto rounded border border-night-line px-1.5 py-0.5 text-white/60 hover:text-white">Accept file</button>
                )}
              </div>
              <pre className="overflow-x-auto py-1 font-mono text-[11.5px] leading-5">
                {lines.map((l, i) => {
                  const removed = i === 2;
                  return (
                    <div key={i} className={clsx("px-3", removed ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/[0.07] text-emerald-200/90")}>
                      <span className="mr-3 inline-block w-4 select-none text-right text-white/25">{i + 1}</span>
                      {removed ? "- " : "+ "}
                      {l}
                    </div>
                  );
                })}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Terminal({ plan, files, branch }: { plan: Plan; files: GenFile[]; branch?: string }) {
  const [lines, setLines] = useState<{ t: string; kind: "in" | "out" | "agent" }[]>([
    { t: "architect agent ran: pnpm typecheck && pytest -q", kind: "agent" },
    { t: "✓ 0 type errors · 12 passed in 1.84s", kind: "out" },
  ]);
  const [cmd, setCmd] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);

  const run = (c: string) => {
    const out: string[] = (() => {
      const [bin, ...args] = c.trim().split(/\s+/);
      switch (bin) {
        case "":
          return [];
        case "help":
          return ["commands: ls, cat <file>, git status, git log, pytest, pnpm test, pnpm dev, env, whoami, clear"];
        case "ls":
          return [[...new Set(files.map((f) => f.path.split("/")[0]))].join("  ")];
        case "cat": {
          const f = files.find((x) => x.path === args[0]);
          return f ? f.content.split("\n").slice(0, 20) : [`cat: ${args[0] ?? ""}: No such file`];
        }
        case "git":
          if (args[0] === "status") return [`On branch ${branch ?? "main"}`, "nothing to commit, working tree clean"];
          if (args[0] === "log") return ["a91c2e4 feat: initial build of " + plan.name, "3c07b1d chore: scaffold from template"];
          return [`git ${args.join(" ")}: ok`];
        case "pytest":
          return ["============ test session starts ============", ...plan.agents.map((a) => `tests/test_${a.name.toLowerCase()}.py ....  [100%]`), `============ ${plan.agents.length * 4} passed in 1.9s ============`];
        case "pnpm":
          if (args[0] === "test") return ["✓ app/page.test.tsx (6 tests) 312ms", "Test Files  1 passed", "Tests  6 passed"];
          if (args[0] === "dev") return ["▲ Next.js 15.5 — Local: http://localhost:3000 (already running, HMR attached)"];
          return [`pnpm ${args.join(" ")}: done`];
        case "env":
          return ["NODE_ENV=development", "PORT=3000", "ARCHITECT_SANDBOX=sbx_7f3a", "(secrets are injected by the egress proxy and never shown here)"];
        case "whoami":
          return ["architect (uid 1000) — unprivileged user inside a Firecracker microVM"];
        default:
          return [`bash: ${bin}: command not found (try "help")`];
      }
    })();
    if (c.trim() === "clear") return setLines([]);
    setLines((l) => [...l, { t: c, kind: "in" }, ...out.map((t) => ({ t, kind: "out" as const }))]);
  };

  return (
    <div className="scroll-night h-40 overflow-y-auto bg-night px-3 py-2 font-mono text-[11.5px] leading-5" onClick={(e) => {
        e.currentTarget.querySelector("input")?.focus();
      }}>
      {lines.map((l, i) => (
        <p key={i} className={l.kind === "in" ? "text-white" : l.kind === "agent" ? "text-[#8ea0ff]" : "whitespace-pre text-white/60"}>
          {l.kind === "in" ? <span className="text-emerald-400">~/app $ </span> : l.kind === "agent" ? "◆ " : ""}
          {l.t}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(cmd);
          setCmd("");
        }}
        className="flex"
      >
        <span className="text-emerald-400">~/app $&nbsp;</span>
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} className="flex-1 bg-transparent text-white outline-none" aria-label="Terminal input" spellCheck={false} />
      </form>
      <div ref={end} />
    </div>
  );
}
