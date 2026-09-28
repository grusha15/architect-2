"use client";

import clsx from "clsx";
import { useState } from "react";
import { Bell, Bot, CheckCircle2, ChevronRight, Loader2, Play, Search, Upload } from "lucide-react";
import type { Plan, PreviewState } from "@/lib/types";
import { humanize, sampleValue, tone } from "@/lib/sample";

export interface Revealed {
  shell: boolean;
  data: boolean;
  agent: boolean;
  pages: number[];
}

export const ALL_REVEALED: Revealed = { shell: true, data: true, agent: true, pages: [0, 1, 2, 3, 4, 5] };

const OUTPUTS: Record<string, string> = {
  kyc: "Case #4821 — Passport and bank statement verified. Missing: proof of address (older than 90 days). Risk score 38 → routed to reviewer.",
  support: "Ticket #1932 — Intent: refund · Urgency: high · Sentiment: frustrated. Drafted reply citing refund policy §3. VIP account → escalated to #support-leads.",
  sales: "Lead: Sofia Rossi @ Globex — ICP fit 87/100. Hiring 12 ML engineers, raised Series B. Drafted a 3-step sequence referencing their data-platform launch.",
  recruiting: "Aarav Mehta → Senior Backend Engineer: match 91/100 (Go, distributed systems, 6 yrs). Interview booked Thu 14:00 with the panel.",
  research: "Weekly briefing ready: 3 competitors shipped agent features; pricing moved to usage-based at 2 of 3. 14 sources cited, confidence 0.82.",
  finance: "INV-2231 from Northwind ($4,280) matched PO-889 and receipt. Duplicate of INV-2207 suspected — held for approval.",
  generic: "Done — the workflow completed 3 steps in 4.2s. Output reviewed and passed guardrails.",
  llm: "Done — the workflow completed every step and the reviewer approved the output.",
};

const SAMPLE_INPUT: Record<string, string> = {
  kyc: "passport_scan.pdf, bank_statement_aug.pdf",
  support: "“I was charged twice and still no refund after 2 weeks. This is ridiculous.” — VIP customer",
  sales: "New inbound: sofia.rossi@globex.com (demo request)",
  recruiting: "resume_aarav_mehta.pdf → Senior Backend Engineer",
  research: "Track: agent platforms, vibe-coding tools",
  finance: "invoice_northwind_2231.pdf",
};

export function GeneratedApp({
  plan,
  preview,
  revealed,
  editMode,
  selectedId,
  onSelect,
  page,
  setPage,
  narrow,
}: {
  plan: Plan;
  preview: PreviewState;
  revealed: Revealed;
  editMode?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string, label: string) => void;
  page: number;
  setPage: (i: number) => void;
  narrow?: boolean;
}) {
  const dark = preview.dark;
  const radius = preview.radius === "sharp" ? 4 : preview.radius === "round" ? 18 : 10;
  const accent = preview.accent;
  const ent = plan.data[0];

  const T = (id: string, label: string) => ({
    "data-edit": id,
    "data-selected": selectedId === id ? "true" : undefined,
    onClick: (e: React.MouseEvent) => {
      if (!editMode) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(id, label);
    },
  });

  const card = clsx("border", dark ? "border-white/10 bg-white/[0.04]" : "border-black/[0.08] bg-white");
  const muted = dark ? "text-white/55" : "text-black/50";

  if (!revealed.shell) return <AppSkeleton />;

  return (
    <div
      className={clsx("flex h-full min-h-[560px] text-[13px]", dark ? "bg-[#0d0f16] text-white" : "bg-[#f7f7f8] text-[#111]", editMode && "edit-mode")}
      style={{ ["--r" as string]: `${radius}px` }}
    >
      {/* Sidebar */}
      {!narrow && (
        <aside className={clsx("w-48 shrink-0 border-r p-3", dark ? "border-white/10" : "border-black/[0.07] bg-white")}>
          <div {...T("brand", "App name & logo")}>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <span className="grid size-6 place-items-center text-[11px] font-bold text-white" style={{ background: accent, borderRadius: radius / 1.6 }}>
                {plan.name[0]}
              </span>
              <span className="truncate font-semibold">{plan.name}</span>
            </div>
          </div>
          <nav className="mt-4 space-y-0.5" {...T("nav", "Navigation")}>
            {plan.pages.map((p, i) => (
              <button
                key={p.name}
                onClick={() => !editMode && setPage(i)}
                className={clsx("flex w-full items-center gap-2 px-2 py-1.5 text-left", page === i ? "font-medium" : muted)}
                style={page === i ? { background: `${accent}18`, color: dark ? "#fff" : accent, borderRadius: radius / 1.5 } : { borderRadius: radius / 1.5 }}
              >
                <span className="size-1.5 rounded-full" style={{ background: page === i ? accent : "currentColor", opacity: page === i ? 1 : 0.35 }} />
                {revealed.pages.includes(i) ? p.name : <span className="skeleton h-3 w-20 rounded" />}
              </button>
            ))}
          </nav>
          {revealed.agent && (
            <div className={clsx("mt-6 p-2.5", card)} style={{ borderRadius: radius }}>
              <p className="flex items-center gap-1.5 text-[11px] font-medium"><Bot className="size-3.5" style={{ color: accent }} /> {plan.agents.length} agents online</p>
              <p className={clsx("mt-1 text-[10.5px]", muted)}>{plan.agents.map((a) => a.name).join(" → ")}</p>
            </div>
          )}
        </aside>
      )}

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className={clsx("flex items-center gap-3 border-b px-5 py-3", dark ? "border-white/10" : "border-black/[0.07] bg-white")}>
          {narrow && (
            <select value={page} onChange={(e) => setPage(Number(e.target.value))} className="bg-transparent font-semibold outline-none">
              {plan.pages.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
            </select>
          )}
          <div className={clsx("flex flex-1 items-center gap-2 px-2.5 py-1.5", dark ? "bg-white/5" : "bg-black/[0.04]")} style={{ borderRadius: radius }}>
            <Search className={clsx("size-3.5", muted)} />
            <span className={muted}>Search {ent.entity.toLowerCase()}s…</span>
          </div>
          <Bell className={clsx("size-4", muted)} />
          <span className="grid size-7 place-items-center rounded-full bg-black/10 text-[11px] font-semibold">PN</span>
        </header>

        {!revealed.pages.includes(page) ? (
          <div className="space-y-4 p-6">
            <div className="skeleton h-7 w-56 rounded" />
            <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
            <div className="skeleton h-56 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div {...T("headline", "Page headline")}>
                <h1 className="text-[20px] font-semibold tracking-tight">{page === 0 && preview.headline ? preview.headline : plan.pages[page].name}</h1>
                <p className={clsx("mt-0.5", muted)}>{plan.pages[page].description}</p>
              </div>
              <button {...T("primary-btn", "Primary button")}>
                <span className="flex items-center gap-1.5 px-3.5 py-2 font-medium text-white shadow-sm" style={{ background: accent, borderRadius: radius }}>
                  <Upload className="size-3.5" /> New {ent.entity.toLowerCase()}
                </span>
              </button>
            </div>

            {page === 0 && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" {...T("stats", "Stat cards")}>
                  {[
                    { l: `Open ${ent.entity.toLowerCase()}s`, v: "128", d: "+12 today" },
                    { l: "Handled by agents", v: "86%", d: "↑ 9 pts this week" },
                    { l: "Avg. time to resolve", v: "4m 12s", d: "was 3h 40m" },
                  ].map((s) => (
                    <div key={s.l} className={clsx("p-3.5", card)} style={{ borderRadius: radius }}>
                      <p className={clsx("text-[11.5px]", muted)}>{s.l}</p>
                      <p className="mt-1 text-[22px] font-semibold tracking-tight">{s.v}</p>
                      <p className="text-[11px]" style={{ color: accent }}>{s.d}</p>
                    </div>
                  ))}
                </div>
                <DataTable plan={plan} revealed={revealed.data} card={card} muted={muted} radius={radius} T={T} dark={dark} />
              </>
            )}

            {page === 1 && (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className={clsx("p-4", card)} style={{ borderRadius: radius }} {...T("detail", "Record detail")}>
                  <p className="font-semibold">{sampleValue(ent.fields[0], 0)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    {ent.fields.map((f, i) => (
                      <div key={f}>
                        <dt className={clsx("text-[11px]", muted)}>{humanize(f)}</dt>
                        <dd className="mt-0.5 font-medium">{sampleValue(f, i === 0 ? 0 : 1)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className={clsx("p-4", card)} style={{ borderRadius: radius }}>
                  <p className="text-[11.5px] font-medium" style={{ color: accent }}>Agent notes</p>
                  <p className="mt-2 leading-relaxed">{OUTPUTS[plan.domain] ?? OUTPUTS.generic}</p>
                </div>
              </div>
            )}

            {page >= 2 && (
              <div className={clsx("p-4", card)} style={{ borderRadius: radius }} {...T("chart", "Chart")}>
                <p className="font-medium">Last 12 weeks</p>
                <div className="mt-4 flex h-40 items-end gap-2">
                  {[34, 42, 38, 55, 49, 61, 58, 70, 66, 79, 83, 92].map((h, i) => (
                    <div key={i} className="flex-1" style={{ height: `${h}%`, background: i === 11 ? accent : `${accent}55`, borderRadius: `${radius / 2}px ${radius / 2}px 2px 2px` }} />
                  ))}
                </div>
              </div>
            )}

            {revealed.agent ? <AgentConsole plan={plan} accent={accent} card={card} muted={muted} radius={radius} dark={dark} T={T} /> : <div className="skeleton h-40 rounded-lg" />}

            {preview.extraSections.map((s, i) => (
              <div key={s + i} className={clsx("anim-rise p-4", card)} style={{ borderRadius: radius }} {...T(`extra-${i}`, s)}>
                <p className="font-semibold">{s}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className={clsx("h-16 p-2", dark ? "bg-white/5" : "bg-black/[0.03]")} style={{ borderRadius: radius / 1.5 }}>
                      <div className="h-1.5 w-10 rounded" style={{ background: accent }} />
                      <div className={clsx("mt-2 h-1.5 w-16 rounded", dark ? "bg-white/15" : "bg-black/10")} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DataTable({
  plan,
  revealed,
  card,
  muted,
  radius,
  T,
  dark,
}: {
  plan: Plan;
  revealed: boolean;
  card: string;
  muted: string;
  radius: number;
  dark: boolean;
  T: (id: string, label: string) => object;
}) {
  const ent = plan.data[0];
  const cols = ent.fields.slice(0, 5);
  if (!revealed) return <div className="skeleton h-56 rounded-lg" />;
  return (
    <div className={clsx("overflow-hidden", card)} style={{ borderRadius: radius }} {...T("table", "Data table")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className={clsx("border-b text-[11px] uppercase tracking-wide", dark ? "border-white/10" : "border-black/[0.06]", muted)}>
              {cols.map((c) => <th key={c} className="px-3.5 py-2.5 font-medium">{humanize(c)}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((r) => (
              <tr key={r} className={clsx("border-b last:border-0", dark ? "border-white/5" : "border-black/[0.04]")}>
                {cols.map((c, ci) => {
                  const v = sampleValue(c, r);
                  const t = tone(v);
                  return (
                    <td key={c} className={clsx("px-3.5 py-2.5", ci === 0 && "font-medium")}>
                      {ci > 0 && t !== "neutral" && /status|stage|priority|sentiment|match/.test(c) ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                          style={{ background: t === "ok" ? "#0f9d6b1f" : t === "warn" ? "#c77a061f" : "#d23b3b1f", color: t === "ok" ? "#0f9d6b" : t === "warn" ? "#c77a06" : "#d23b3b" }}
                        >
                          {v}
                        </span>
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
                <td className="px-2"><ChevronRight className={clsx("size-3.5", muted)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentConsole({
  plan,
  accent,
  card,
  muted,
  radius,
  dark,
  T,
}: {
  plan: Plan;
  accent: string;
  card: string;
  muted: string;
  radius: number;
  dark: boolean;
  T: (id: string, label: string) => object;
}) {
  const [input, setInput] = useState(SAMPLE_INPUT[plan.domain] ?? "Describe the task for the agents…");
  const [step, setStep] = useState(-1);
  const running = step >= 0 && step < plan.agents.length;
  const done = step >= plan.agents.length;

  const run = () => {
    setStep(0);
    plan.agents.forEach((_, i) => setTimeout(() => setStep(i + 1), 900 * (i + 1)));
  };

  return (
    <div className={clsx("p-4", card)} style={{ borderRadius: radius }} {...T("agent-console", "Agent console")}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-semibold"><Bot className="size-4" style={{ color: accent }} /> Run the agents</p>
        <span className={clsx("text-[11px]", muted)}>{plan.agents.map((a) => a.name).join(" → ")}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={clsx("h-9 flex-1 border px-3 outline-none", dark ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}
          style={{ borderRadius: radius }}
        />
        <button onClick={run} disabled={running} className="flex items-center gap-1.5 px-3 font-medium text-white disabled:opacity-60" style={{ background: accent, borderRadius: radius }}>
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run
        </button>
      </div>
      {step >= 0 && (
        <div className="mt-3 space-y-1.5">
          {plan.agents.map((a, i) => (
            <div key={a.name} className={clsx("flex items-center gap-2 text-[12px]", i >= step && !done && i !== step && "opacity-40")}>
              {i < step ? <CheckCircle2 className="size-3.5 text-[#0f9d6b]" /> : i === step ? <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} /> : <span className="size-3.5 rounded-full border border-current opacity-40" />}
              <span className="font-medium">{a.name}</span>
              <span className={muted}>{a.role}</span>
            </div>
          ))}
          {done && (
            <div className="anim-rise mt-2 p-3 leading-relaxed" style={{ background: `${accent}14`, borderRadius: radius / 1.3 }}>
              {OUTPUTS[plan.domain] ?? OUTPUTS.generic}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="flex h-full min-h-[560px] bg-[#f7f7f8]">
      <div className="w-48 space-y-2 border-r border-black/5 bg-white p-3">
        <div className="skeleton h-6 w-28 rounded" />
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-4 w-32 rounded" />)}
      </div>
      <div className="flex-1 space-y-4 p-6">
        <div className="skeleton h-7 w-48 rounded" />
        <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
        <div className="skeleton h-64 rounded-lg" />
      </div>
    </div>
  );
}
