"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Code2,
  FolderGit2,
  History,
  ListChecks,
  MonitorPlay,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Composer, type ComposerSubmit } from "@/components/Composer";
import { GitHubIcon, Wordmark } from "@/components/icons";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { EXAMPLE_PROMPTS, FRAMEWORKS, MODELS } from "@/lib/planner";
import { savePending, startProject } from "@/lib/start";

export default function Landing() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState("");

  const go = async (v: ComposerSubmit) => {
    setBusy(true);
    const pending = { prompt: v.prompt, source: "prompt" as const, framework: v.framework, model: v.model };
    if (!user) {
      savePending(pending);
      router.push("/login?next=/new");
      return;
    }
    const id = await startProject(pending);
    router.push(`/p/${id}`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Link href="/">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-5 text-[13.5px] text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#lenses" className="hover:text-ink">For developers</a>
            <Link href="/architecture" className="hover:text-ink">Architecture</Link>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Button variant="dark" onClick={() => router.push("/home")}>
                Open dashboard <ArrowRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push("/login")}>Sign in</Button>
                <Button variant="dark" onClick={() => router.push("/login")}>Start building</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bp-grid relative border-b border-line">
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <p className="label-mono mb-5 inline-flex items-center gap-2 rounded-full border border-bp-100 bg-bp-50 px-3 py-1 text-bp">
            <Sparkles className="size-3" /> For builders and developers
          </p>
          <h1 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[58px]">
            Describe it. Watch it build.
            <br />
            <span className="text-bp">Own every line.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[16px] leading-relaxed text-ink-2">
            Architect turns a sentence into a working agentic app — with a plan you approve, a live preview, real code in your GitHub, and a URL your team can use today.
          </p>
          <div className="mt-9 text-left">
            <Composer onSubmit={go} busy={busy} autoFocus initial={seed} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.slice(0, 3).map((p) => (
              <button
                key={p}
                onClick={() => setSeed(p)}
                className="max-w-[260px] truncate rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-bp hover:text-bp"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-[12.5px] text-ink-3">
            <button onClick={() => router.push(user ? "/import" : "/login?next=/import")} className="flex items-center gap-1.5 hover:text-ink">
              <GitHubIcon className="size-3.5" /> Import an existing repo
            </button>
            <span className="h-3 w-px bg-line-strong" />
            <button onClick={() => router.push(user ? "/home#templates" : "/login")} className="flex items-center gap-1.5 hover:text-ink">
              <Boxes className="size-3.5" /> Start from a template
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <SectionHead kicker="How it works" title="From intent to a live URL in five visible steps" body="No black box. Every step shows what the agent is doing — in plain English by default, down to the tool calls when you want them." />
        <ol className="mt-10 grid gap-3 md:grid-cols-5">
          {[
            { icon: Sparkles, t: "Prompt", d: "Say what you want. Attach docs, screenshots or a Figma file." },
            { icon: ListChecks, t: "Plan", d: "Review pages, agents, data and cost before any code is written." },
            { icon: MonitorPlay, t: "Build", d: "Watch the UI appear live while the agent writes real code." },
            { icon: ShieldCheck, t: "Verify", d: "Tests, type-checks and a visual check run on every change." },
            { icon: Rocket, t: "Ship", d: "Preflight, deploy, and share. Roll back in one click." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-bp" />
                <span className="font-mono text-[11px] text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Two lenses */}
      <section id="lenses" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead kicker="One project, two lenses" title="The founder and the engineer work on the same thing" body="Most tools force a hand-off: prototype here, rebuild there. In Architect, the Preview lens and the Code lens are two views of one Git-backed project." />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <LensCard
              tone="light"
              icon={<MonitorPlay className="size-4" />}
              title="Preview lens — for builders"
              points={["Chat, plan and live preview", "Click any element to change it", "Restore points with thumbnails", "Plain-English errors with one-click fixes"]}
            />
            <LensCard
              tone="dark"
              icon={<Code2 className="size-4" />}
              title="Code lens — for developers"
              points={["Editor, terminal and per-turn diffs", "Import any repo, bring any framework", "Pick the model per task, bring your own key", "Branches, PRs and CI — never force-pushed"]}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHead kicker="Built for agentic apps" title="Agents are first-class, not an API key in .env" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Workflow, t: "Agent Studio", d: "See your agents as a graph, test them in a playground, inspect every trace." },
            { icon: Bot, t: "Any framework", d: FRAMEWORKS.map((f) => f.label).join(" · ") },
            { icon: Sparkles, t: "Any model", d: MODELS.filter((m) => m.id !== "auto").map((m) => m.label).slice(0, 5).join(" · ") },
            { icon: History, t: "Checkpoints", d: "Every agent turn is a git commit. Undo works on product changes, not keystrokes." },
            { icon: FolderGit2, t: "GitHub, both ways", d: "Create or import repos. Changes land on branches and PRs; pushes sync back." },
            { icon: ShieldCheck, t: "Evals before deploy", d: "Auto-generated test cases run against your agents before anything ships." },
            { icon: Rocket, t: "One-click deploy", d: "Architect Cloud, Vercel or Docker export. Preview env per branch." },
            { icon: Boxes, t: "Integrations & MCP", d: "Slack, Sheets, Gmail, HubSpot, Supabase — or any MCP server." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-line bg-surface p-5">
              <f.icon className="size-5 text-bp" />
              <h3 className="mt-3 font-semibold">{f.t}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead kicker="Pricing" title="Pay for what you build and what you run" />
          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {[
              { n: "Free", p: "$0", d: ["50 build credits / mo", "architect.app subdomain", "Public repos"] },
              { n: "Pro", p: "$25", d: ["500 credits", "Bring your own keys", "Private repos & custom domains"], hi: true },
              { n: "Team", p: "$40/seat", d: ["Shared secrets & roles", "SSO", "Preview env per branch"] },
              { n: "Enterprise", p: "Custom", d: ["VPC sandboxes", "Audit log & SLAs", "Lyzr Agent Runtime"] },
            ].map((t) => (
              <div key={t.n} className={`rounded-xl border p-5 ${t.hi ? "border-bp ring-4 ring-bp-50" : "border-line"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t.n}</h3>
                  {t.hi && <span className="label-mono text-bp">Popular</span>}
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{t.p}</p>
                <ul className="mt-4 space-y-1.5 text-[13px] text-ink-2">
                  {t.d.map((x) => (
                    <li key={x}>— {x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-[13px] text-ink-3">
          <Wordmark />
          <span>A take-home concept for Lyzr — Architect 2.0.</span>
          <Link href="/architecture" className="ml-auto hover:text-ink">Technical architecture →</Link>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="label-mono text-bp">{kicker}</p>
      <h2 className="mt-2 text-balance text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h2>
      {body && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{body}</p>}
    </div>
  );
}

function LensCard({ tone, icon, title, points }: { tone: "light" | "dark"; icon: React.ReactNode; title: string; points: string[] }) {
  const dark = tone === "dark";
  return (
    <div className={`overflow-hidden rounded-2xl border ${dark ? "border-night-line bg-night text-white" : "border-line bg-paper"}`}>
      <div className={`flex items-center gap-2 border-b px-5 py-3 text-[13px] font-medium ${dark ? "border-night-line" : "border-line"}`}>
        {icon} {title}
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_1.1fr]">
        <ul className={`space-y-2 text-[13.5px] ${dark ? "text-white/75" : "text-ink-2"}`}>
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className={dark ? "text-[#8ea0ff]" : "text-bp"}>→</span> {p}
            </li>
          ))}
        </ul>
        {dark ? (
          <pre className="scroll-night overflow-x-auto rounded-lg bg-night-2 p-3 font-mono text-[11px] leading-5 text-white/80">
            <span className="text-white/40"># agents/graph.py</span>
            {"\n"}
            <span className="text-[#c792ea]">graph</span>.add_node(<span className="text-[#c3e88d]">&quot;classifier&quot;</span>, classify)
            {"\n"}
            <span className="text-[#c792ea]">graph</span>.add_edge(<span className="text-[#c3e88d]">&quot;classifier&quot;</span>, <span className="text-[#c3e88d]">&quot;responder&quot;</span>)
            {"\n"}
            <span className="text-emerald-400">+ graph.add_node(&quot;retry&quot;, backoff)</span>
            {"\n"}
            <span className="text-white/40">$ pytest -q → 12 passed</span>
          </pre>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="flex gap-1.5">
              <span className="h-2 w-10 rounded bg-bp" />
              <span className="h-2 w-16 rounded bg-sunken" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded-md border border-line bg-paper" />
              ))}
            </div>
            <div className="mt-2 h-14 rounded-md border border-dashed border-bp bg-bp-50/60 p-2 text-[10.5px] text-bp">Make this button green →</div>
          </div>
        )}
      </div>
    </div>
  );
}
