"use client";

import clsx from "clsx";
import { Fragment, useMemo, useState } from "react";
import { Bot, Check, CircleX, Code2, FlaskConical, Loader2, Play, ScrollText, ShieldCheck, Wrench, X } from "lucide-react";
import { FRAMEWORKS, MODELS } from "@/lib/planner";
import type { Framework, Plan, PlanAgent } from "@/lib/types";
import { Badge, Button, Toggle } from "../ui";

interface Span {
  agent: string;
  ms: number;
  tokens: number;
  cost: number;
  tool: string;
}
interface Trace {
  id: string;
  input: string;
  at: string;
  spans: Span[];
  ok: boolean;
}

const NODE_W = 176;
const GAP = 64;
const TOOL_Y = 128;
const TOOL_STEP = 36;

function makeSpans(plan: Plan, seed = 1): Span[] {
  return plan.agents.map((a, i) => {
    const ms = 380 + ((i + 1) * 431 * seed) % 1400;
    const tokens = 600 + ((i + 2) * 977 * seed) % 2400;
    return { agent: a.name, ms, tokens, cost: +(tokens * 0.000004).toFixed(4), tool: a.tools[0] ?? "reasoning" };
  });
}

export function AgentStudio({ plan, onChange, onFramework, onOpenCode }: { plan: Plan; onChange: (p: Plan) => void; onFramework: (f: Framework) => void; onOpenCode: () => void }) {
  const [sel, setSel] = useState<number | null>(0);
  const [tab, setTab] = useState<"playground" | "traces" | "evals">("playground");
  const [traces, setTraces] = useState<Trace[]>(() => [1, 2, 3].map((s) => ({ id: `tr_${s}${plan.name.length}`, input: ["sample A", "sample B", "sample C"][s - 1], at: new Date(Date.now() - s * 36e5).toISOString(), spans: makeSpans(plan, s), ok: s !== 2 })));
  const [activeSpan, setActiveSpan] = useState(-1);

  const width = (plan.agents.length + 2) * (NODE_W + GAP);
  const nodes = useMemo(() => [{ kind: "io" as const, label: "Input", sub: "User / trigger" }, ...plan.agents.map((a) => ({ kind: "agent" as const, label: a.name, sub: a.model, a })), { kind: "io" as const, label: "Output", sub: "UI · Slack · API" }], [plan.agents]);

  const updateAgent = (i: number, patch: Partial<PlanAgent>) => onChange({ ...plan, agents: plan.agents.map((a, k) => (k === i ? { ...a, ...patch } : a)) });

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
        <span className="text-[13px] font-semibold">Agent Studio</span>
        <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
          Framework
          <select value={plan.framework} onChange={(e) => onFramework(e.target.value as Framework)} className="h-7 rounded-md border border-line bg-surface px-1.5 text-[12px] font-medium outline-none">
            {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <span className="hidden text-[11.5px] text-ink-3 lg:inline">Switching regenerates the adapter — the manifest, prompts and UI stay the same.</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onOpenCode}><Code2 className="size-3.5" /> View code</Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Graph canvas */}
        <div className="bp-grid scroll-thin relative min-w-0 flex-1 overflow-auto">
          <div className="relative" style={{ width, height: 300, margin: "40px 24px" }}>
            <svg className="absolute inset-0" width={width} height={300} aria-hidden>
              {nodes.slice(0, -1).map((_, i) => {
                const x1 = i * (NODE_W + GAP) + NODE_W;
                const x2 = (i + 1) * (NODE_W + GAP);
                const live = activeSpan >= 0 && (activeSpan === i || activeSpan === i - 1);
                return (
                  <g key={i}>
                    <line x1={x1} y1={60} x2={x2} y2={60} stroke={live ? "#2747d6" : "#b9bfd6"} strokeWidth={live ? 2.5 : 1.5} className="flow-line" />
                    <polygon points={`${x2 - 6},55 ${x2},60 ${x2 - 6},65`} fill={live ? "#2747d6" : "#b9bfd6"} />
                  </g>
                );
              })}
              {plan.agents.map((a, i) => {
                const cx = (i + 1) * (NODE_W + GAP) + NODE_W / 2;
                return a.tools.length ? <line key={i} x1={cx} y1={96} x2={cx} y2={TOOL_Y + (a.tools.length - 1) * TOOL_STEP + 14} stroke="#cfcbbf" strokeWidth={1.2} strokeDasharray="3 4" /> : null;
              })}
            </svg>
            {nodes.map((n, i) => (
              <Fragment key={n.label + i}>
                <button
                  onClick={() => n.kind === "agent" && setSel(i - 1)}
                  className={clsx(
                    "absolute flex h-[72px] flex-col justify-center rounded-xl border bg-surface px-3 text-left shadow-sm transition",
                    n.kind === "io" ? "border-dashed border-line-strong" : sel === i - 1 ? "border-bp ring-4 ring-bp-50" : "border-line hover:border-line-strong",
                    activeSpan === i - 1 && n.kind === "agent" && "border-bp",
                  )}
                  style={{ left: i * (NODE_W + GAP), top: 24, width: NODE_W }}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {n.kind === "agent" ? <Bot className="size-3.5 text-bp" /> : <span className="size-2 rounded-full bg-ink-3" />}
                    {n.label}
                    {activeSpan === i - 1 && n.kind === "agent" && <Loader2 className="ml-auto size-3.5 animate-spin text-bp" />}
                  </span>
                  <span className="mt-0.5 truncate font-mono text-[10.5px] text-ink-3">{n.sub}</span>
                </button>
                {n.kind === "agent" &&
                  n.a.tools.map((t, k) => {
                    const cx = i * (NODE_W + GAP) + NODE_W / 2;
                    return (
                      <span key={t} className="absolute flex h-7 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 font-mono text-[10px] text-ink-2 shadow-sm" style={{ left: cx, top: TOOL_Y + k * TOOL_STEP }}>
                        <Wrench className="size-2.5" />
                        {t}
                      </span>
                    );
                  })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Inspector */}
        {sel !== null && plan.agents[sel] && (
          <aside className="scroll-thin hidden w-72 shrink-0 overflow-y-auto border-l border-line bg-surface p-4 lg:block">
            <div className="flex items-center justify-between">
              <p className="label-mono text-ink-3">Agent</p>
              <button onClick={() => setSel(null)} aria-label="Close inspector" className="rounded p-0.5 text-ink-3 hover:bg-sunken"><X className="size-3.5" /></button>
            </div>
            <input value={plan.agents[sel].name} onChange={(e) => updateAgent(sel, { name: e.target.value })} className="mt-1 w-full text-[16px] font-semibold outline-none" aria-label="Agent name" />
            <label className="mt-4 block text-[12px] font-medium text-ink-2">
              Instructions
              <textarea value={plan.agents[sel].role} onChange={(e) => updateAgent(sel, { role: e.target.value })} rows={4} className="mt-1 w-full resize-none rounded-lg border border-line p-2 text-[12.5px] leading-relaxed outline-none focus:border-bp" />
            </label>
            <label className="mt-3 block text-[12px] font-medium text-ink-2">
              Model
              <select value={plan.agents[sel].model} onChange={(e) => updateAgent(sel, { model: e.target.value })} className="mt-1 h-8 w-full rounded-lg border border-line bg-surface px-2 text-[12.5px] outline-none">
                {[...new Set([plan.agents[sel].model, ...MODELS.filter((m) => m.id !== "auto").map((m) => m.id), "gpt-5-mini"])].map((m) => <option key={m} value={m}>{MODELS.find((x) => x.id === m)?.label ?? m}</option>)}
              </select>
            </label>
            <div className="mt-3">
              <p className="text-[12px] font-medium text-ink-2">Tools</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...new Set([...plan.agents[sel].tools, "web_search", "http", "slack", "sql"])].map((t) => {
                  const on = plan.agents[sel].tools.includes(t);
                  return (
                    <button key={t} onClick={() => updateAgent(sel, { tools: on ? plan.agents[sel].tools.filter((x) => x !== t) : [...plan.agents[sel].tools, t] })} className={clsx("rounded-md border px-1.5 py-0.5 font-mono text-[11px]", on ? "border-bp bg-bp-50 text-bp" : "border-line text-ink-3 hover:text-ink")}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 space-y-2.5 border-t border-line pt-3 text-[12.5px]">
              <Row label="Short-term memory"><Toggle on label="Memory" onChange={() => {}} /></Row>
              <Row label="PII redaction"><Toggle on label="PII redaction" onChange={() => {}} /></Row>
              <Row label="Human approval before actions"><Toggle on={sel === plan.agents.length - 1} label="Human approval" onChange={() => {}} /></Row>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-3"><ShieldCheck className="size-3.5" /> Changes are saved to prompts/ and the manifest.</p>
          </aside>
        )}
      </div>

      {/* Bottom panel */}
      <div className="h-[260px] shrink-0 border-t border-line bg-surface">
        <div className="flex h-9 items-center gap-1 border-b border-line px-2">
          {([
            ["playground", Play, "Playground"],
            ["traces", ScrollText, "Traces"],
            ["evals", FlaskConical, "Evals"],
          ] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium", tab === k ? "bg-sunken text-ink" : "text-ink-3 hover:text-ink")}>
              <Icon className="size-3.5" /> {label}
              {k === "traces" && <span className="font-mono text-[10.5px] text-ink-3">{traces.length}</span>}
            </button>
          ))}
        </div>
        <div className="scroll-thin h-[calc(100%-36px)] overflow-y-auto p-3">
          {tab === "playground" && <Playground plan={plan} setActive={setActiveSpan} onTrace={(t) => setTraces((s) => [t, ...s])} />}
          {tab === "traces" && <Traces traces={traces} />}
          {tab === "evals" && <Evals plan={plan} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function Playground({ plan, setActive, onTrace }: { plan: Plan; setActive: (i: number) => void; onTrace: (t: Trace) => void }) {
  const [input, setInput] = useState("");
  const [spans, setSpans] = useState<Span[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    const all = makeSpans(plan, (input.length % 5) + 1);
    setRunning(true);
    setSpans([]);
    for (let i = 0; i < all.length; i++) {
      setActive(i);
      await new Promise((r) => setTimeout(r, Math.min(1100, all[i].ms)));
      setSpans((s) => [...s, all[i]]);
    }
    setActive(-1);
    setRunning(false);
    onTrace({ id: `tr_${Date.now().toString(36)}`, input: input || "(empty)", at: new Date().toISOString(), spans: all, ok: true });
  };

  const total = spans.reduce((a, s) => ({ ms: a.ms + s.ms, tokens: a.tokens + s.tokens, cost: a.cost + s.cost }), { ms: 0, tokens: 0, cost: 0 });
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1.3fr]">
      <div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder="Paste a sample input, or describe a scenario to test…" className="w-full resize-none rounded-lg border border-line p-2.5 text-[13px] outline-none focus:border-bp" />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={run} loading={running}><Play className="size-3.5" /> Run workflow</Button>
          <span className="text-[11.5px] text-ink-3">Runs in the sandbox with your real prompts & tools.</span>
        </div>
      </div>
      <div className="rounded-lg border border-line p-2.5">
        {spans.length === 0 && !running ? (
          <p className="p-4 text-center text-[12.5px] text-ink-3">Run the workflow to see each agent&apos;s step, latency, tokens and cost.</p>
        ) : (
          <div className="space-y-1.5">
            {spans.map((s) => (
              <div key={s.agent} className="anim-rise flex items-center gap-2 text-[12.5px]">
                <Check className="size-3.5 text-ok" />
                <span className="w-24 truncate font-medium">{s.agent}</span>
                <span className="font-mono text-[11px] text-ink-3">{s.tool}()</span>
                <span className="ml-auto font-mono text-[11px] text-ink-2">{s.ms}ms · {s.tokens} tok · ${s.cost.toFixed(4)}</span>
              </div>
            ))}
            {running && <p className="flex items-center gap-2 text-[12.5px] text-ink-3"><Loader2 className="size-3.5 animate-spin" /> running…</p>}
            {!running && spans.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[12px]">
                <Badge tone="ok">Completed</Badge>
                <span className="font-mono text-ink-2">{(total.ms / 1000).toFixed(2)}s · {total.tokens} tok · ${total.cost.toFixed(4)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Traces({ traces }: { traces: Trace[] }) {
  const [open, setOpen] = useState<string | null>(traces[0]?.id ?? null);
  return (
    <div className="space-y-1.5">
      {traces.map((t) => {
        const total = t.spans.reduce((a, s) => a + s.ms, 0);
        return (
          <div key={t.id} className="rounded-lg border border-line">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[12.5px]">
              {t.ok ? <Check className="size-3.5 text-ok" /> : <CircleX className="size-3.5 text-bad" />}
              <span className="font-mono text-[11px] text-ink-3">{t.id}</span>
              <span className="flex-1 truncate">{t.input}</span>
              <span className="font-mono text-[11px] text-ink-2">{(total / 1000).toFixed(2)}s</span>
              <span className="w-16 text-right text-[11px] text-ink-3">{new Date(t.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </button>
            {open === t.id && (
              <div className="space-y-1 border-t border-line px-3 py-2">
                {t.spans.map((s, i) => {
                  const offset = t.spans.slice(0, i).reduce((a, x) => a + x.ms, 0);
                  return (
                    <div key={s.agent} className="flex items-center gap-2 text-[11.5px]">
                      <span className="w-24 truncate">{s.agent}</span>
                      <div className="relative h-3 flex-1 rounded bg-sunken">
                        <div className={clsx("absolute h-3 rounded", !t.ok && i === 1 ? "bg-bad" : "bg-bp")} style={{ left: `${(offset / total) * 100}%`, width: `${(s.ms / total) * 100}%` }} />
                      </div>
                      <span className="w-14 text-right font-mono text-ink-3">{s.ms}ms</span>
                    </div>
                  );
                })}
                {!t.ok && <p className="pt-1 text-[11.5px] text-bad">Tool timeout on step 2 — retried once, then escalated to a human.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Evals({ plan }: { plan: Plan }) {
  const cases = useMemo(
    () => [
      `Happy path: typical ${plan.data[0].entity.toLowerCase()} is processed end-to-end`,
      "Missing required field → agent asks for it instead of guessing",
      "Prompt injection in user input is ignored",
      "PII is redacted from logs and outputs",
      `${plan.agents[plan.agents.length - 1].name} escalates when confidence < 0.6`,
    ],
    [plan],
  );
  const [results, setResults] = useState<(boolean | null)[]>(cases.map(() => null));
  const [running, setRunning] = useState(false);
  const [gate, setGate] = useState(true);
  const run = async () => {
    setRunning(true);
    setResults(cases.map(() => null));
    for (let i = 0; i < cases.length; i++) {
      await new Promise((r) => setTimeout(r, 450));
      setResults((r) => r.map((x, k) => (k === i ? i !== 3 : x)));
    }
    setRunning(false);
  };
  const passed = results.filter((r) => r === true).length;
  const doneAll = results.every((r) => r !== null);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="primary" onClick={run} loading={running}><FlaskConical className="size-3.5" /> Run {cases.length} evals</Button>
        {doneAll && <Badge tone={passed / cases.length >= 0.8 ? "ok" : "warn"}>{passed}/{cases.length} passed · {Math.round((passed / cases.length) * 100)}%</Badge>}
        <span className="ml-auto flex items-center gap-2 text-[12px] text-ink-2">Block deploy below 80% <Toggle on={gate} onChange={setGate} label="Deploy gate" /></span>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {cases.map((c, i) => (
          <li key={c} className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
            {results[i] === null ? (running ? <Loader2 className="size-3.5 animate-spin text-ink-3" /> : <span className="size-3.5 rounded-full border border-line-strong" />) : results[i] ? <Check className="size-3.5 text-ok" /> : <CircleX className="size-3.5 text-bad" />}
            <span className="flex-1">{c}</span>
            {results[i] === false && <button className="text-[11.5px] font-medium text-bp hover:underline">Fix with agent</button>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-3">Generated from your plan. Save any playground run as a test case to grow this set.</p>
    </div>
  );
}
