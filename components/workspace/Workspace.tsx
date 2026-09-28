"use client";

import clsx from "clsx";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Code2,
  Database,
  History,
  KeyRound,
  MessageSquare,
  MonitorPlay,
  Plug,
  Rocket,
  ScrollText,
  Share2,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { attachmentContext } from "@/lib/attachments";
import { buildSteps, type BuildStep } from "@/lib/build";
import { FRAMEWORKS, MODELS, needsClarification } from "@/lib/planner";
import { getProfile, uid, updateProject } from "@/lib/store";
import type { Attachment, ChatMessage, Checkpoint, Framework, Plan, PreviewState, Project, ProjectData, ViewMode } from "@/lib/types";
import { GitHubIcon, Logo } from "../icons";
import { Badge, Button, Segmented, timeAgo } from "../ui";
import { useToast } from "../toast";
import { AgentStudio } from "./AgentStudio";
import { ChatPanel, type Detail } from "./ChatPanel";
import { CodeLens } from "./CodeLens";
import { DeployModal } from "./DeployModal";
import { ALL_REVEALED, type Revealed } from "./GeneratedApp";
import { DataPanel, DeployPanel, DrawerShell, GitPanel, IntegrationsPanel, LogsPanel, SecretsPanel, type DrawerKey } from "./panels";
import { Preview } from "./Preview";
import { ShareModal } from "./ShareModal";

const COLORS: Record<string, string> = {
  green: "#0f9d6b", emerald: "#059669", red: "#d23b3b", blue: "#2747d6", purple: "#7c3aed", violet: "#7c3aed",
  orange: "#ea580c", pink: "#db2777", teal: "#0d9488", black: "#111827", yellow: "#d97706", amber: "#d97706", indigo: "#4f46e5",
};

function interpret(text: string, selected: { id: string; label: string } | null, preview: PreviewState) {
  const t = text.toLowerCase();
  const next: PreviewState = { ...preview, extraSections: [...preview.extraSections] };
  const changes: string[] = [];
  const files = new Set<string>();

  const color = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`).test(t));
  if (color) {
    next.accent = COLORS[color];
    changes.push(`switched the ${selected ? selected.label.toLowerCase() : "brand"} color to ${color}`);
    files.add("app/globals.css").add("components/ui/button.tsx");
  }
  if (/\bdark\b/.test(t)) {
    next.dark = true;
    changes.push("added a dark theme");
    files.add("app/globals.css").add("app/layout.tsx");
  } else if (/\blight\b/.test(t)) {
    next.dark = false;
    changes.push("switched back to the light theme");
    files.add("app/globals.css");
  }
  if (/round|pill|soft|curv/.test(t)) {
    next.radius = "round";
    changes.push("rounded the corners");
    files.add("tailwind.config.ts");
  } else if (/sharp|square|flat/.test(t)) {
    next.radius = "sharp";
    changes.push("made corners sharper");
    files.add("tailwind.config.ts");
  }
  const quoted = text.match(/["“']([^"”']{3,80})["”']/);
  if (quoted && (/headline|title|heading|say|rename|text/.test(t) || selected?.id === "headline")) {
    next.headline = quoted[1];
    changes.push(`changed the headline to “${quoted[1]}”`);
    files.add("app/page.tsx");
  }
  const add = text.match(/\b(add|include|create|show|build)\b\s+(?:a |an |the |some )?(.{3,48}?)(?:[.,!]|$| to | on | for | that | with )/i);
  if (add && !color && !quoted) {
    const title = add[2].trim().replace(/^\w/, (c) => c.toUpperCase());
    next.extraSections.push(title);
    changes.push(`added a “${title}” section`);
    files.add("app/page.tsx").add(`components/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.tsx`);
  }
  if (!changes.length) {
    changes.push(selected ? `updated the ${selected.label.toLowerCase()} as requested` : "applied your change");
    files.add("app/page.tsx");
  }
  return { preview: next, summary: changes.join(", "), files: [...files] };
}

export function Workspace({ initial }: { initial: Project }) {
  const { user, githubToken } = useAuth();
  const toast = useToast();
  const search = useSearchParams();
  const [project, setProject] = useState(initial);
  const data = project.data;
  const plan = data.plan;

  /* ------------------------------ persistence ----------------------------- */
  const latest = useRef(project);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback(
    (fn: (p: Project) => Project) => {
      setProject((prev) => {
        const next = { ...fn(prev), updated_at: new Date().toISOString() };
        latest.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const p = latest.current;
          updateProject(p.id, { name: p.name, status: p.status, slug: p.slug, published: p.published, data: p.data }).catch((e) => toast(`Save failed: ${e.message}`, "warn"));
        }, 350);
        return next;
      });
    },
    [toast],
  );
  const updateData = useCallback((fn: (d: ProjectData) => Partial<ProjectData>, extra: Partial<Project> = {}) => commit((p) => ({ ...p, ...extra, data: { ...p.data, ...fn(p.data) } })), [commit]);

  /* --------------------------------- view --------------------------------- */
  const [view, setView] = useState<ViewMode>((search.get("view") as ViewMode) || (data.source === "import" ? "code" : "preview"));
  const [detail, setDetail] = useState<Detail>(data.source === "import" ? "technical" : "plain");
  const [drawer, setDrawer] = useState<DrawerKey | null>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "app">("chat");
  const [deployOpen, setDeployOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    if (!user || search.get("view")) return;
    getProfile(user.id).then((p) => {
      if (!p) return;
      if (p.role === "developer") setDetail("technical");
      if (data.built && p.default_view) setView(p.default_view);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditMode(false);
        setHistoryOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3"].includes(e.key) && plan) {
        e.preventDefault();
        setView((["preview", "code", "agents"] as ViewMode[])[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plan]);

  /* -------------------------------- planning ------------------------------ */
  const [planning, setPlanning] = useState(false);
  const requested = useRef(false);
  const requestPlan = useCallback(
    async (answers: Record<string, string>) => {
      setPlanning(true);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: latest.current.data.prompt, answers, model: latest.current.data.model, framework: answers.framework, context: attachmentContext(latest.current.data.attachments) }),
        });
        const json = (await res.json()) as { plan: Plan; source: "llm" | "fallback" };
        updateData(() => ({ plan: json.plan, planSource: json.source, answers: { ...answers, done: "1" } }), { name: json.plan.name, status: "planning" });
      } catch {
        toast("Couldn't reach the planner, retrying offline", "warn");
      } finally {
        setPlanning(false);
      }
    },
    [updateData, toast],
  );

  const clarifyNeeded = !plan && data.source === "prompt" && !data.answers?.done && needsClarification(data.prompt);
  useEffect(() => {
    if (!plan && !clarifyNeeded && !planning && !requested.current) {
      requested.current = true;
      requestPlan(data.answers ?? {});
    }
  }, [plan, clarifyNeeded, planning, requestPlan, data.answers]);

  /* --------------------------------- build -------------------------------- */
  const [building, setBuilding] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps: BuildStep[] = useMemo(() => (plan ? buildSteps(plan) : []), [plan]);
  const [logs, setLogs] = useState<string[]>(() => (data.built ? ["✓ dev server ready on :3000", "✓ HMR connected", "GET / 200 in 41ms"] : []));

  const approve = (p: Plan) => {
    updateData(() => ({ plan: p }), { name: p.name, status: "building" });
    setStepIndex(0);
    setPaused(false);
    setBuilding(true);
    setLogs([]);
  };

  useEffect(() => {
    if (!building || paused) return;
    if (stepIndex >= steps.length) {
      const now = new Date().toISOString();
      const cp: Checkpoint = { id: uid(), title: `Initial build of ${plan!.name}`, detail: `${plan!.pages.length} pages · ${plan!.agents.length} agents`, at: now, files: 9 + plan!.pages.length + plan!.agents.length, preview: latest.current.data.preview };
      const msg: ChatMessage = {
        id: uid(),
        role: "agent",
        at: now,
        text: `**${plan!.name} is ready.** Try it in the preview: run the agents on the sample input, or click **Visual edit** to change anything by pointing at it.\n\nNext, you'll probably want to connect GitHub so the code is yours, and publish when you're happy.`,
      };
      updateData((d) => ({ built: true, checkpoints: [...d.checkpoints, cp], messages: [...d.messages, msg] }), { status: "ready" });
      setBuilding(false);
      toast("Build complete · restore point saved");
      return;
    }
    const s = steps[stepIndex];
    const t = setTimeout(() => {
      setLogs((l) => [...l, ...s.calls.map((c) => (c.startsWith("✗") ? c : `[${s.kind}] ${c}`))]);
      setStepIndex((i) => i + 1);
    }, s.ms);
    return () => clearTimeout(t);
  }, [building, paused, stepIndex, steps, plan, updateData, toast]);

  const revealed: Revealed = useMemo(() => {
    if (data.built) return ALL_REVEALED;
    const r: Revealed = { shell: false, data: false, agent: false, pages: [] };
    steps.slice(0, stepIndex).forEach((s) => {
      if (!s.reveal) return;
      if (s.reveal.type === "shell") r.shell = true;
      if (s.reveal.type === "data") r.data = true;
      if (s.reveal.type === "agent") r.agent = true;
      if (s.reveal.type === "page") r.pages.push(s.reveal.index);
    });
    return r;
  }, [data.built, steps, stepIndex]);

  const phase = data.built ? "ready" : building ? "building" : plan ? "review" : planning || !clarifyNeeded ? "planning" : "clarify";

  /* ------------------------------- iterate -------------------------------- */
  const [agentBusy, setAgentBusy] = useState(false);
  const addCheckpoint = (d: ProjectData, title: string, preview: PreviewState, files: number): Pick<ProjectData, "checkpoints" | "git"> => ({
    checkpoints: [...d.checkpoints, { id: uid(), title, detail: `${files} files`, at: new Date().toISOString(), files, preview }],
    git: d.git ? { ...d.git, ahead: d.git.ahead + 1 } : null,
  });

  const send = (text: string, attachments: Attachment[] = []) => {
    const userMsg: ChatMessage = { id: uid(), role: "user", text: selected ? `[${selected.label}] ${text}` : text, at: new Date().toISOString(), attachments: attachments.length ? attachments : undefined };
    updateData((d) => ({ messages: [...d.messages, userMsg] }));
    setAgentBusy(true);
    const sel = selected;
    setSelected(null);
    setEditMode(false);
    setTimeout(() => {
      const r = interpret(text, sel, latest.current.data.preview);
      if (attachments.some((a) => a.kind === "image" || a.kind === "figma")) r.summary += ", using your attached design as the visual reference";
      else if (attachments.some((a) => a.text)) r.summary += `, using the content of ${attachments.filter((a) => a.text).map((a) => a.name).join(", ")}`;
      const reply: ChatMessage = {
        id: uid(),
        role: "agent",
        at: new Date().toISOString(),
        text: `Done. I ${r.summary}. Restore point saved, so you can undo this anytime.${detail === "technical" ? `\n\nChanged ${r.files.map((f) => `\`${f}\``).join(", ")} · typecheck ✓ · visual check ✓` : ""}`,
      };
      updateData((d) => ({ preview: r.preview, messages: [...d.messages, reply], ...addCheckpoint(d, text.slice(0, 60), r.preview, r.files.length) }));
      setLogs((l) => [...l, ...r.files.map((f) => `[edit] apply_patch ${f}`), "hmr: update applied"]);
      setAgentBusy(false);
    }, 1500);
  };

  const restore = (cp: Checkpoint) => {
    updateData((d) => ({
      preview: cp.preview,
      messages: [...d.messages, { id: uid(), role: "system", text: `Restored “${cp.title}”`, at: new Date().toISOString() }],
    }));
    setHistoryOpen(false);
    toast(`Restored “${cp.title}”`);
  };

  const switchFramework = (fw: Framework) => {
    if (!plan || fw === plan.framework) return;
    const label = FRAMEWORKS.find((f) => f.id === fw)!.label;
    updateData((d) => ({ plan: { ...d.plan!, framework: fw }, ...addCheckpoint(d, `Switched agents to ${label}`, d.preview, 3) }));
    toast(`Regenerated adapter for ${label} · 3 files changed`);
  };

  /* -------------------------------- deploy -------------------------------- */
  const slugBase = (project.slug ?? project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
  const onDeployed = ({ env, target, slug }: { env: "preview" | "production"; target: string; slug: string }) => {
    const finalSlug = env === "preview" ? `${slug}-preview` : slug;
    const url = `${window.location.origin}/apps/${finalSlug}`;
    updateData(
      (d) => ({
        deployments: [
          ...d.deployments.map((x) => (x.env === env && x.status === "live" ? { ...x, status: "superseded" as const } : x)),
          { id: uid(), env, target, url, commit: Math.random().toString(16).slice(2, 9), at: new Date().toISOString(), status: "live" as const },
        ],
      }),
      env === "production" ? { status: "live", slug: finalSlug, published: true } : { published: true, slug: project.slug ?? finalSlug },
    );
    return url;
  };
  const rollback = (id: string) => {
    updateData((d) => {
      const target = d.deployments.find((x) => x.id === id)!;
      return { deployments: d.deployments.map((x) => (x.id === id ? { ...x, status: "live" as const } : x.env === target.env && x.status === "live" ? { ...x, status: "rolled-back" as const } : x)) };
    });
    toast("Rolled back · traffic shifted in 4s");
  };

  const liveUrl = data.deployments.find((d) => d.status === "live")?.url;
  const missingSecrets = plan ? plan.secrets.filter((s) => !data.secrets.some((x) => x.key === s)) : [];
  const suggestions = [
    { label: "▶ Try the agents", onClick: () => { setView("preview"); setMobilePane("app"); } },
    ...(!data.git ? [{ label: "Connect GitHub", onClick: () => setDrawer("git") }] : []),
    ...(missingSecrets.length ? [{ label: `Add ${missingSecrets.length} secret${missingSecrets.length > 1 ? "s" : ""}`, onClick: () => setDrawer("secrets") }] : []),
    { label: "Open Agent Studio", onClick: () => setView("agents") },
    { label: "Publish", onClick: () => setDeployOpen(true) },
  ];

  const RAIL: { key: DrawerKey; icon: typeof Rocket; label: string; dot?: boolean }[] = [
    { key: "git", icon: GitHubIcon as unknown as typeof Rocket, label: "GitHub", dot: Boolean(data.git && data.git.ahead > 0) },
    { key: "deploy", icon: Rocket, label: "Deploy" },
    { key: "secrets", icon: KeyRound, label: "Secrets", dot: missingSecrets.length > 0 && data.built },
    { key: "integrations", icon: Plug, label: "Integrations" },
    { key: "data", icon: Database, label: "Database" },
    { key: "logs", icon: ScrollText, label: "Logs" },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* ------------------------------ Top bar ------------------------------ */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5">
        <Link href="/home" className="rounded-md p-1 hover:bg-sunken" aria-label="Back to dashboard"><Logo size={22} /></Link>
        <input
          value={project.name}
          onChange={(e) => commit((p) => ({ ...p, name: e.target.value }))}
          className="w-28 min-w-0 truncate rounded-md bg-transparent px-1.5 py-1 text-[13.5px] font-semibold outline-none hover:bg-sunken focus:bg-sunken sm:w-48"
          aria-label="Project name"
        />
        <StatusPill status={project.status} building={building} />

        <div className="mx-auto hidden md:block">
          <Segmented
            value={view}
            onChange={(v) => plan && setView(v)}
            options={[
              { value: "preview", label: "Preview", icon: <MonitorPlay className="size-3.5" /> },
              { value: "code", label: "Code", icon: <Code2 className="size-3.5" /> },
              { value: "agents", label: "Agents", icon: <Workflow className="size-3.5" /> },
            ]}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <button onClick={() => setMobilePane((m) => (m === "chat" ? "app" : "chat"))} className="rounded-md border border-line p-1.5 md:hidden" aria-label="Toggle chat">
            {mobilePane === "chat" ? <MonitorPlay className="size-4" /> : <MessageSquare className="size-4" />}
          </button>
          <label className="relative hidden lg:block" title="Model used by the Architect agent">
            <select value={data.model} onChange={(e) => updateData(() => ({ model: e.target.value }))} className="h-8 appearance-none rounded-lg border border-line bg-surface pl-7 pr-6 text-[12.5px] font-medium outline-none hover:border-line-strong">
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <Bot className="pointer-events-none absolute left-2 top-2 size-4 text-ink-3" />
            <ChevronDown className="pointer-events-none absolute right-1.5 top-2.5 size-3 text-ink-3" />
          </label>

          <div className="relative">
            <Button size="sm" variant="ghost" onClick={() => setHistoryOpen((v) => !v)} disabled={!data.checkpoints.length} className="h-8">
              <History className="size-4" /> <span className="hidden sm:inline">{data.checkpoints.length}</span>
            </Button>
            {historyOpen && (
              <div className="anim-rise absolute right-0 top-10 z-40 w-80 rounded-xl border border-line bg-surface p-2 shadow-xl">
                <p className="label-mono px-2 py-1 text-ink-3">Restore points</p>
                <ul className="scroll-thin max-h-80 overflow-y-auto">
                  {[...data.checkpoints].reverse().map((cp, i) => (
                    <li key={cp.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-paper">
                      <span className={clsx("h-9 w-12 shrink-0 rounded border p-1", cp.preview.dark ? "border-night-line bg-night" : "border-line bg-paper")}>
                        <span className="block h-1 w-5 rounded" style={{ background: cp.preview.accent }} />
                        <span className="mt-1 block h-1 w-8 rounded bg-line" />
                        <span className="mt-1 grid grid-cols-3 gap-0.5">{[0, 1, 2].map((k) => <span key={k} className="h-2 rounded-sm border border-line" />)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">{cp.title}</span>
                        <span className="block text-[11px] text-ink-3">{timeAgo(cp.at)} · {cp.detail}</span>
                      </span>
                      {i === 0 ? <Badge>Current</Badge> : <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100" onClick={() => restore(cp)}>Restore</Button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button size="sm" variant="ghost" className="hidden h-8 sm:inline-flex" onClick={() => setShareOpen(true)}><Share2 className="size-4" /> Share</Button>
          <Button size="sm" variant="primary" className="h-8" disabled={!data.built} onClick={() => setDeployOpen(true)}>
            <Rocket className="size-3.5" /> {project.status === "live" ? "Update" : "Publish"}
          </Button>
        </div>
      </header>

      {/* ------------------------------- Body -------------------------------- */}
      <div className="flex min-h-0 flex-1">
        <div className={clsx("min-h-0 w-full shrink-0 border-r border-line md:block md:w-[360px] xl:w-[390px]", mobilePane === "chat" ? "block" : "hidden")}>
          <ChatPanel
            prompt={data.prompt}
            promptAttachments={data.attachments}
            imported={data.source === "import"}
            phase={phase}
            plan={plan}
            planSource={data.planSource}
            onAnswer={(a) => requestPlan({ ...(data.answers ?? {}), ...a })}
            onApprove={approve}
            onRegenerate={() => {
              updateData(() => ({ plan: null }));
              requestPlan({ ...(data.answers ?? {}), seed: String(Date.now()) });
            }}
            steps={steps}
            stepIndex={data.built ? steps.length : stepIndex}
            paused={paused}
            onStop={() => {
              setPaused(true);
              toast("Build paused", "info");
            }}
            onResume={() => setPaused(false)}
            messages={data.messages}
            onSend={send}
            agentBusy={agentBusy}
            selected={selected}
            clearSelected={() => setSelected(null)}
            detail={detail}
            setDetail={setDetail}
            suggestions={suggestions}
          />
        </div>

        <main className={clsx("min-h-0 min-w-0 flex-1 md:block", mobilePane === "app" ? "block" : "hidden")}>
          {view === "preview" || !plan ? (
            <Preview
              plan={phase === "building" || phase === "ready" ? plan : null}
              preview={data.preview}
              revealed={revealed}
              building={building}
              editMode={editMode}
              setEditMode={(v) => {
                setEditMode(v);
                if (!v) setSelected(null);
              }}
              selectedId={selected?.id ?? null}
              onSelect={(id, label) => {
                setSelected({ id, label });
                setMobilePane("chat");
              }}
              sandboxId={`sbx-${project.id.slice(0, 4)}`}
              liveUrl={liveUrl}
              logs={logs}
            />
          ) : view === "code" ? (
            <CodeLens plan={plan} checkpoints={data.checkpoints} gitBranch={data.git?.branch} onAcceptAll={() => toast("Accepted · committed to branch")} />
          ) : (
            <AgentStudio plan={plan} onChange={(p) => updateData(() => ({ plan: p }))} onFramework={switchFramework} onOpenCode={() => setView("code")} />
          )}
        </main>

        {drawer && plan && (
          <aside className="anim-rise fixed inset-y-0 right-0 z-30 w-full max-w-[360px] border-l border-line shadow-xl lg:static lg:z-auto lg:w-[340px] lg:shadow-none">
            {drawer === "git" && (
              <DrawerShell title="GitHub" subtitle="Your code, versioned and portable." onClose={() => setDrawer(null)}>
                <GitPanel plan={plan} git={data.git} githubToken={githubToken} userLogin={(user?.name ?? "you").replace(/\s+/g, "").toLowerCase()} onChange={(g) => updateData(() => ({ git: g }))} toast={toast} />
              </DrawerShell>
            )}
            {drawer === "deploy" && (
              <DrawerShell title="Deployments" onClose={() => setDrawer(null)}>
                <DeployPanel deployments={data.deployments} built={data.built} onDeploy={() => setDeployOpen(true)} onRollback={rollback} />
              </DrawerShell>
            )}
            {drawer === "secrets" && (
              <DrawerShell title="Secrets" subtitle="API keys and tokens your app needs." onClose={() => setDrawer(null)}>
                <SecretsPanel plan={plan} secrets={data.secrets} onChange={(s) => updateData(() => ({ secrets: s }))} toast={toast} />
              </DrawerShell>
            )}
            {drawer === "integrations" && (
              <DrawerShell title="Integrations" subtitle="Give your agents tools and data." onClose={() => setDrawer(null)}>
                <IntegrationsPanel plan={plan} connected={data.integrations} onChange={(c) => updateData(() => ({ integrations: c }))} toast={toast} />
              </DrawerShell>
            )}
            {drawer === "data" && (
              <DrawerShell title="Database" subtitle="Managed Postgres · branch per environment." onClose={() => setDrawer(null)}>
                <DataPanel plan={plan} />
              </DrawerShell>
            )}
            {drawer === "logs" && (
              <DrawerShell title="Logs" subtitle="Build, agent and runtime output." onClose={() => setDrawer(null)}>
                <LogsPanel logs={logs} />
              </DrawerShell>
            )}
          </aside>
        )}

        <nav className="hidden w-12 shrink-0 flex-col items-center gap-1 border-l border-line bg-surface py-2 md:flex" aria-label="Project tools">
          {RAIL.map((r) => (
            <button
              key={r.key}
              onClick={() => plan && setDrawer(drawer === r.key ? null : r.key)}
              disabled={!plan}
              title={r.label}
              aria-label={r.label}
              className={clsx("relative grid size-9 place-items-center rounded-lg transition disabled:opacity-30", drawer === r.key ? "bg-bp-50 text-bp" : "text-ink-3 hover:bg-sunken hover:text-ink")}
            >
              <r.icon className="size-[18px]" />
              {r.dot && <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-surface bg-warn" />}
            </button>
          ))}
        </nav>
      </div>

      {plan && (
        <DeployModal
          open={deployOpen}
          onClose={() => setDeployOpen(false)}
          plan={plan}
          secrets={data.secrets}
          defaultSlug={slugBase}
          onOpenSecrets={() => setDrawer("secrets")}
          onDeployed={onDeployed}
        />
      )}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} projectName={project.name} owner={{ name: user?.name ?? "You", email: user?.email ?? "" }} />
    </div>
  );
}

function StatusPill({ status, building }: { status: Project["status"]; building: boolean }) {
  if (building) return <Badge tone="bp"><span className="size-1.5 animate-pulse rounded-full bg-bp" /> Building</Badge>;
  const map: Record<Project["status"], [string, "neutral" | "ok" | "warn" | "bad" | "bp"]> = {
    draft: ["Draft", "neutral"],
    planning: ["Planning", "bp"],
    building: ["Paused", "warn"],
    ready: ["Ready", "neutral"],
    live: ["Live", "ok"],
    error: ["Error", "bad"],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone} className="hidden sm:inline-flex">{label}</Badge>;
}
