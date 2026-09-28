"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, Code2, ExternalLink, FilePlus2, Globe, LayoutGrid, List, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Composer, type ComposerSubmit } from "@/components/Composer";
import { GitHubIcon } from "@/components/icons";
import { Badge, Button, Field, Modal, inputCls, timeAgo } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/lib/auth";
import { FRAMEWORKS, TEMPLATES } from "@/lib/planner";
import { startProject } from "@/lib/start";
import { deleteProject, listProjects } from "@/lib/store";
import type { Framework, Project } from "@/lib/types";

const STATUS: Record<Project["status"], { label: string; tone: "neutral" | "ok" | "warn" | "bad" | "bp" }> = {
  draft: { label: "Draft", tone: "neutral" },
  planning: { label: "Planning", tone: "bp" },
  building: { label: "Building", tone: "bp" },
  ready: { label: "Ready", tone: "neutral" },
  live: { label: "Live", tone: "ok" },
  error: { label: "Needs attention", tone: "bad" },
};

export default function HomePage() {
  return (
    <AppShell>
      <Home />
    </AppShell>
  );
}

function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [blankOpen, setBlankOpen] = useState(false);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => {
        setProjects([]);
        toast(`Couldn't load projects: ${e.message}`, "warn");
      });
  }, [toast]);

  const filtered = useMemo(() => (projects ?? []).filter((p) => p.name.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const deployments = useMemo(
    () =>
      (projects ?? [])
        .flatMap((p) => p.data.deployments.map((d) => ({ ...d, project: p })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5),
    [projects],
  );

  const build = async (v: ComposerSubmit) => {
    setBusy(true);
    const id = await startProject({ prompt: v.prompt, source: "prompt", framework: v.framework, model: v.model });
    router.push(`/p/${id}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">
        {greeting}, {user?.name.split(" ")[0]}. What should we build?
      </h1>
      <p className="mt-1 text-[14px] text-ink-2">Describe an app or agent. You&apos;ll review a plan before anything is built.</p>

      <div className="mt-6">
        <Composer onSubmit={build} busy={busy} size="md" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StartCard icon={<GitHubIcon className="size-[18px]" />} title="Import from GitHub" body="Bring an existing repo — we detect the stack and boot it." onClick={() => router.push("/import")} />
        <StartCard icon={<Boxes className="size-[18px]" />} title="Start from a template" body="Proven agent apps you can remix in minutes." onClick={() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" })} />
        <StartCard icon={<FilePlus2 className="size-[18px]" />} title="Blank project" body="Pick a framework and start in the Code lens." onClick={() => setBlankOpen(true)} />
      </div>

      {/* Projects */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[16px] font-semibold">Your projects</h2>
          <span className="font-mono text-[12px] text-ink-3">{projects?.length ?? "…"}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-ink-3" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className={inputCls + " h-8 w-48 pl-8 text-[13px]"} aria-label="Search projects" />
            </div>
            <div className="flex rounded-lg border border-line bg-surface p-0.5">
              <button aria-label="Grid view" onClick={() => setLayout("grid")} className={clsx("rounded-md p-1", layout === "grid" && "bg-sunken")}><LayoutGrid className="size-4" /></button>
              <button aria-label="List view" onClick={() => setLayout("list")} className={clsx("rounded-md p-1", layout === "list" && "bg-sunken")}><List className="size-4" /></button>
            </div>
          </div>
        </div>

        {projects === null ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
            <p className="font-medium">{query ? "No projects match that search." : "No projects yet"}</p>
            <p className="mt-1 text-[13.5px] text-ink-2">{query ? "Try a different name." : "Describe something above, or remix a template below."}</p>
          </div>
        ) : layout === "grid" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                p={p}
                onOpen={() => router.push(`/p/${p.id}`)}
                onDelete={async () => {
                  await deleteProject(p.id);
                  setProjects((s) => (s ?? []).filter((x) => x.id !== p.id));
                  toast(`Deleted ${p.name}`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => router.push(`/p/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                <span className="size-2.5 rounded-full" style={{ background: p.data.preview.accent }} />
                <span className="flex-1 truncate text-[14px] font-medium">{p.name}</span>
                <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                <span className="w-24 text-right text-[12px] text-ink-3">{timeAgo(p.updated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      <section id="templates" className="mt-14 scroll-mt-6">
        <h2 className="text-[16px] font-semibold">Templates</h2>
        <p className="mt-0.5 text-[13.5px] text-ink-2">Each one is a complete agent app with a different framework — a good way to see how Architect handles each.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                const id = await startProject({ prompt: t.prompt, source: "template", framework: t.framework });
                router.push(`/p/${id}`);
              }}
              className="group rounded-xl border border-line bg-surface p-4 text-left transition hover:border-bp hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Badge tone="bp">{FRAMEWORKS.find((f) => f.id === t.framework)?.label}</Badge>
                <span className="text-[11.5px] text-ink-3">{t.uses} remixes</span>
              </div>
              <h3 className="mt-3 font-semibold">{t.title}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{t.prompt}</p>
              <span className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-bp opacity-0 transition group-hover:opacity-100">
                Use template <ArrowRight className="size-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Deployments */}
      <section id="deployments" className="mt-14 scroll-mt-6">
        <h2 className="text-[16px] font-semibold">Recent deployments</h2>
        {deployments.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-2">Nothing deployed yet. Publish a project and it shows up here with its URL and history.</p>
        ) : (
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {deployments.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
                <Globe className="size-4 text-ok" />
                <span className="font-medium">{d.project.name}</span>
                <Badge tone={d.env === "production" ? "ok" : "bp"}>{d.env}</Badge>
                <span className="font-mono text-[12px] text-ink-3">{d.commit}</span>
                <a href={d.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 truncate text-bp hover:underline">
                  {d.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                </a>
                <span className="w-20 text-right text-[12px] text-ink-3">{timeAgo(d.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <BlankProjectModal open={blankOpen} onClose={() => setBlankOpen(false)} />
    </div>
  );
}

function StartCard({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex gap-3 rounded-xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-ink">{icon}</span>
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12.5px] leading-snug text-ink-2">{body}</span>
      </span>
    </button>
  );
}

function ProjectCard({ p, onOpen, onDelete }: { p: Project; onOpen: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const accent = p.data.preview.accent;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-surface transition hover:shadow-md">
      <button onClick={onOpen} className="block w-full text-left">
        <div className={clsx("bp-grid-fine relative h-28 border-b border-line p-3", p.data.preview.dark ? "bg-night" : "bg-paper")}>
          <div className={clsx("h-full rounded-md border p-2 shadow-sm", p.data.preview.dark ? "border-night-line bg-night-2" : "border-line bg-surface")}>
            <div className="flex gap-1">
              <span className="h-1.5 w-8 rounded" style={{ background: accent }} />
              <span className="h-1.5 w-12 rounded bg-line" />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="h-5 rounded border border-line/70" />)}
            </div>
            <div className="mt-1.5 space-y-1">
              <span className="block h-1.5 w-full rounded bg-line/70" />
              <span className="block h-1.5 w-3/4 rounded bg-line/70" />
            </div>
          </div>
          {p.data.source === "import" && <Badge className="absolute left-2 top-2" tone="neutral"><Code2 className="size-3" /> Imported</Badge>}
        </div>
        <div className="p-3.5">
          <div className="flex items-center gap-2">
            <h3 className="flex-1 truncate text-[14px] font-semibold">{p.name}</h3>
            <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-3">{p.data.plan?.summary ?? p.data.prompt ?? "—"}</p>
          <p className="mt-2 text-[11.5px] text-ink-3">Edited {timeAgo(p.updated_at)}</p>
        </div>
      </button>
      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
        {confirm ? (
          <span className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow">
            <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          </span>
        ) : (
          <button aria-label="Delete project" onClick={() => setConfirm(true)} className="rounded-md border border-line bg-surface p-1.5 text-ink-3 shadow-sm hover:text-bad">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function BlankProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fw, setFw] = useState<Framework>("langgraph");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="New blank project" subtitle="A clean scaffold with your framework, a FastAPI backend and a Next.js front end.">
      <div className="space-y-4">
        <Field label="Project name">
          <input autoFocus className={inputCls} placeholder="my-agent-app" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Agent framework</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {FRAMEWORKS.map((f) => (
              <button key={f.id} onClick={() => setFw(f.id)} className={clsx("rounded-lg border px-3 py-2 text-left", fw === f.id ? "border-bp bg-bp-50" : "border-line hover:border-line-strong")}>
                <span className="flex items-center justify-between text-[13px] font-semibold">{f.label}<span className="font-mono text-[10.5px] font-normal text-ink-3">{f.lang}</span></span>
                <span className="block text-[11.5px] text-ink-2">{f.blurb}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const id = await startProject({ prompt: `A starter agent app called ${name || "my agent app"} with a planner, worker and reviewer agent`, source: "blank", framework: fw });
              router.push(`/p/${id}?view=code`);
            }}
          >
            Create project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
