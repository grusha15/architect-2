"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Coins,
  Database,
  FileText,
  Hammer,
  LayoutPanelLeft,
  ListChecks,
  Loader2,
  MousePointerClick,
  Paperclip,
  Plug,
  RefreshCw,
  Sparkles,
  Square,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import type { BuildStep } from "@/lib/build";
import { CLARIFY_QUESTIONS, FRAMEWORKS } from "@/lib/planner";
import type { Attachment, ChatMessage, Framework, Plan } from "@/lib/types";
import { FILE_ACCEPT, readFiles } from "@/lib/attachments";
import { AttachmentChips } from "../Attachments";
import { Badge, Button, Segmented } from "../ui";

export type Detail = "plain" | "technical";

export interface ChatPanelProps {
  prompt: string;
  promptAttachments?: Attachment[];
  phase: "clarify" | "planning" | "review" | "building" | "ready";
  plan: Plan | null;
  planSource?: "llm" | "fallback";
  onAnswer: (answers: Record<string, string>) => void;
  onApprove: (plan: Plan) => void;
  onRegenerate: () => void;
  steps: BuildStep[];
  stepIndex: number;
  paused: boolean;
  onStop: () => void;
  onResume: () => void;
  messages: ChatMessage[];
  onSend: (text: string, attachments: Attachment[]) => void;
  agentBusy: boolean;
  selected: { id: string; label: string } | null;
  clearSelected: () => void;
  detail: Detail;
  setDetail: (d: Detail) => void;
  suggestions: { label: string; onClick: () => void }[];
  imported?: boolean;
}

export function ChatPanel(p: ChatPanelProps) {
  const feed = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [p.phase, p.stepIndex, p.messages.length, p.agentBusy, p.plan]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Bot className="size-4 text-bp" /> Architect agent</span>
        <Segmented
          size="sm"
          value={p.detail}
          onChange={p.setDetail}
          options={[
            { value: "plain", label: "Plain" },
            { value: "technical", label: "Technical" },
          ]}
        />
      </div>

      <div ref={feed} className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {!p.imported && p.prompt && <UserBubble text={p.prompt} attachments={p.promptAttachments} />}

        {p.phase === "clarify" && <ClarifyCard onDone={p.onAnswer} />}

        {p.phase === "planning" && (
          <AgentRow>
            <div className="space-y-2 rounded-xl border border-line p-3">
              <p className="flex items-center gap-2 text-[13px] text-ink-2"><Loader2 className="size-3.5 animate-spin text-bp" /> Drafting a plan for your review…</p>
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          </AgentRow>
        )}

        {p.plan && !p.imported && (
          <AgentRow>
            <PlanCard plan={p.plan} source={p.planSource} locked={p.phase === "building" || p.phase === "ready"} onApprove={p.onApprove} onRegenerate={p.onRegenerate} detail={p.detail} />
          </AgentRow>
        )}

        {(p.phase === "building" || (p.phase === "ready" && !p.imported)) && p.steps.length > 0 && (
          <AgentRow>
            <Timeline steps={p.steps} index={p.stepIndex} detail={p.detail} done={p.phase === "ready"} paused={p.paused} onStop={p.onStop} onResume={p.onResume} />
          </AgentRow>
        )}

        {p.messages.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.text} attachments={m.attachments} /> : m.role === "system" ? <SystemLine key={m.id} text={m.text} /> : (
          <AgentRow key={m.id}>
            <div className="text-[13.5px] leading-relaxed text-ink"><Rich text={m.text} /></div>
          </AgentRow>
        )))}

        {p.agentBusy && (
          <AgentRow>
            <p className="flex items-center gap-2 text-[13px] text-ink-2"><Loader2 className="size-3.5 animate-spin text-bp" /> Working on it…</p>
          </AgentRow>
        )}

        {p.phase === "ready" && !p.agentBusy && p.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {p.suggestions.map((s) => (
              <button key={s.label} onClick={s.onClick} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:border-bp hover:text-bp">
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ChatComposer
        disabled={p.phase !== "ready" || p.agentBusy}
        hint={p.phase === "building" ? "The agent is building. You can stop it anytime." : p.phase !== "ready" ? "Approve the plan to start building." : undefined}
        onSend={p.onSend}
        selected={p.selected}
        clearSelected={p.clearSelected}
      />
    </div>
  );
}

function AgentRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="anim-rise flex gap-2.5">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-ink text-white"><Sparkles className="size-3.5" /></span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function UserBubble({ text, attachments = [] }: { text: string; attachments?: Attachment[] }) {
  return (
    <div className="anim-rise flex flex-col items-end gap-1.5">
      {attachments.length > 0 && (
        <div className="flex max-w-[88%] justify-end">
          <AttachmentChips items={attachments} size="sm" />
        </div>
      )}
      <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-sunken px-3.5 py-2 text-[13.5px] leading-relaxed">{text}</p>
    </div>
  );
}

function SystemLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-[12px] text-ink-3">
      <span className="h-px flex-1 bg-line" /> {text} <span className="h-px flex-1 bg-line" />
    </p>
  );
}

/** Tiny markdown: **bold**, `code`, and line breaks. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <>
      {parts.map((s, i) =>
        s === "\n" ? <br key={i} /> : s.startsWith("**") ? <b key={i}>{s.slice(2, -2)}</b> : s.startsWith("`") ? <code key={i} className="rounded bg-sunken px-1 py-0.5 font-mono text-[12px]">{s.slice(1, -1)}</code> : <span key={i}>{s}</span>,
      )}
    </>
  );
}

function ClarifyCard({ onDone }: { onDone: (a: Record<string, string>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = CLARIFY_QUESTIONS.every((q) => answers[q.id]);
  return (
    <AgentRow>
      <p className="text-[13.5px]">Before I plan, three quick questions so I build the right thing:</p>
      <div className="mt-3 space-y-3 rounded-xl border border-line p-3">
        {CLARIFY_QUESTIONS.map((q, qi) => (
          <div key={q.id}>
            <p className="text-[12.5px] font-medium text-ink-2"><span className="font-mono text-ink-3">{qi + 1}.</span> {q.q}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {q.options.map((o) => (
                <button
                  key={o}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                  className={clsx("rounded-lg border px-2.5 py-1 text-[12.5px] transition", answers[q.id] === o ? "border-bp bg-bp text-white" : "border-line hover:border-bp hover:text-bp")}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <button onClick={() => onDone({})} className="text-[12.5px] text-ink-3 hover:text-ink">Skip, you decide</button>
          <Button size="sm" variant="primary" disabled={!complete} onClick={() => onDone(answers)}>Draft the plan</Button>
        </div>
      </div>
    </AgentRow>
  );
}

function PlanCard({
  plan,
  source,
  locked,
  onApprove,
  onRegenerate,
  detail,
}: {
  plan: Plan;
  source?: "llm" | "fallback";
  locked: boolean;
  onApprove: (p: Plan) => void;
  onRegenerate: () => void;
  detail: Detail;
}) {
  const [draft, setDraft] = useState(plan);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(!locked);
  useEffect(() => {
    setDraft(plan);
  }, [plan]);
  useEffect(() => {
    setOpen(!locked);
  }, [locked]);

  const toggle = (k: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const final = (): Plan => {
    const pages = draft.pages.filter((x) => !off.has("page:" + x.name));
    const agents = draft.agents.filter((x) => !off.has("agent:" + x.name));
    const integrations = draft.integrations.filter((x) => !off.has("int:" + x));
    return {
      ...draft,
      pages: pages.length ? pages : draft.pages.slice(0, 1),
      agents: agents.length ? agents : draft.agents.slice(0, 1),
      integrations,
      estimate: { minutes: 2 + pages.length, credits: 8 + agents.length * 3 + pages.length * 2 },
    };
  };
  const est = final().estimate;

  if (locked && !open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left hover:border-line-strong">
        <ListChecks className="size-4 text-bp" />
        <span className="flex-1 text-[13px]"><b>Plan approved</b> · {plan.pages.length} pages · {plan.agents.length} agents · {FRAMEWORKS.find((f) => f.id === plan.framework)?.label}</span>
        <ChevronRight className="size-4 text-ink-3" />
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong">
      <div className="flex items-start gap-2 border-b border-line bg-paper px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="label-mono text-bp">Plan · review before build</p>
          {locked ? (
            <p className="mt-1 text-[15px] font-semibold">{draft.name}</p>
          ) : (
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full bg-transparent text-[15px] font-semibold outline-none focus:underline" aria-label="App name" />
          )}
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{draft.summary}</p>
        </div>
        {locked && (
          <button onClick={() => setOpen(false)} aria-label="Collapse plan" className="rounded p-1 text-ink-3 hover:bg-sunken"><ChevronDown className="size-4" /></button>
        )}
      </div>

      <div className="space-y-3 px-3.5 py-3 text-[13px]">
        <PlanGroup icon={LayoutPanelLeft} title="Pages">
          {draft.pages.map((x) => <PlanItem key={x.name} on={!off.has("page:" + x.name)} locked={locked} onToggle={() => toggle("page:" + x.name)} title={x.name} sub={x.description} />)}
        </PlanGroup>
        <PlanGroup icon={Bot} title="Agents" right={
          locked ? <Badge tone="bp">{FRAMEWORKS.find((f) => f.id === draft.framework)?.label}</Badge> : (
            <select value={draft.framework} onChange={(e) => setDraft({ ...draft, framework: e.target.value as Framework })} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11.5px] font-medium outline-none" aria-label="Agent framework">
              {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          )
        }>
          {draft.agents.map((x) => (
            <PlanItem key={x.name} on={!off.has("agent:" + x.name)} locked={locked} onToggle={() => toggle("agent:" + x.name)} title={x.name} sub={detail === "technical" ? `${x.model} · tools: ${x.tools.join(", ")}` : x.role} />
          ))}
        </PlanGroup>
        <PlanGroup icon={Database} title="Data">
          {draft.data.map((d) => <PlanItem key={d.entity} on locked title={d.entity} sub={detail === "technical" ? d.fields.join(", ") : `${d.fields.length} fields · managed Postgres`} />)}
        </PlanGroup>
        {draft.integrations.length > 0 && (
          <PlanGroup icon={Plug} title="Connections">
            <div className="flex flex-wrap gap-1.5">
              {draft.integrations.map((x) => (
                <button key={x} disabled={locked} onClick={() => toggle("int:" + x)} className={clsx("rounded-md border px-2 py-0.5 text-[12px]", off.has("int:" + x) ? "border-dashed border-line text-ink-3 line-through" : "border-line bg-sunken text-ink-2")}>
                  {x}
                </button>
              ))}
            </div>
          </PlanGroup>
        )}
        {detail === "technical" && (
          <p className="rounded-md bg-sunken px-2.5 py-1.5 font-mono text-[11.5px] text-ink-2">
            {draft.stack.frontend} · {draft.stack.backend} · {draft.stack.database}
          </p>
        )}
      </div>

      {!locked && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-paper px-3.5 py-2.5">
          <span className="flex items-center gap-1 text-[12px] text-ink-2"><Clock className="size-3.5" /> ~{est.minutes} min</span>
          <span className="flex items-center gap-1 text-[12px] text-ink-2"><Coins className="size-3.5" /> ~{est.credits} credits</span>
          {source && <span className="font-mono text-[10.5px] text-ink-3">{source === "llm" ? "planned by LLM" : "planned offline"}</span>}
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={onRegenerate}><RefreshCw className="size-3.5" /> Redo</Button>
            <Button size="sm" variant="primary" onClick={() => onApprove(final())}><Hammer className="size-3.5" /> Approve & build</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanGroup({ icon: Icon, title, right, children }: { icon: typeof Bot; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="size-3.5 text-ink-3" />
        <span className="label-mono text-ink-3">{title}</span>
        <span className="ml-auto">{right}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function PlanItem({ on, locked, onToggle, title, sub }: { on: boolean; locked?: boolean; onToggle?: () => void; title: string; sub: string }) {
  return (
    <label className={clsx("flex items-start gap-2 rounded-md px-1 py-1", !locked && "cursor-pointer hover:bg-paper")}>
      <input type="checkbox" checked={on} disabled={locked || !onToggle} onChange={onToggle} className="mt-0.5 accent-[#2747d6]" />
      <span className={clsx("min-w-0", !on && "opacity-45 line-through")}>
        <span className="font-medium">{title}</span>
        <span className="block truncate text-[12px] text-ink-3">{sub}</span>
      </span>
    </label>
  );
}

function Timeline({ steps, index, detail, done, paused, onStop, onResume }: { steps: BuildStep[]; index: number; detail: Detail; done: boolean; paused: boolean; onStop: () => void; onResume: () => void }) {
  const [expanded, setExpanded] = useState(!done);
  useEffect(() => {
    setExpanded(!done);
  }, [done]);
  const total = steps.reduce((a, s) => a + s.ms, 0);

  if (done && !expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="flex w-full items-center gap-2 rounded-xl border border-ok/30 bg-ok-50 px-3 py-2.5 text-left">
        <CircleCheck className="size-4 text-ok" />
        <span className="flex-1 text-[13px]"><b>Built and verified</b> · {steps.length} steps · {(total / 1000).toFixed(0)}s · 1 bug auto-fixed</span>
        <ChevronRight className="size-4 text-ink-3" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="label-mono text-ink-3">Build · {Math.min(index, steps.length)}/{steps.length}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-bp transition-all duration-500" style={{ width: `${(Math.min(index, steps.length) / steps.length) * 100}%` }} />
        </div>
        {!done && (paused ? (
          <Button size="sm" variant="secondary" onClick={onResume}>Resume</Button>
        ) : (
          <button onClick={onStop} className="flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11.5px] text-ink-2 hover:border-bad hover:text-bad"><Square className="size-3" /> Stop</button>
        ))}
        {done && <button onClick={() => setExpanded(false)} aria-label="Collapse" className="rounded p-0.5 text-ink-3 hover:bg-sunken"><X className="size-3.5" /></button>}
      </div>
      <ol className="space-y-0.5 p-2">
        {steps.map((s, i) => {
          const state = i < index ? "done" : i === index && !done ? (paused ? "paused" : "active") : "todo";
          if (state === "todo" && i > index + 2) return null;
          const failed = s.kind === "verify" && s.id === "verify-1" && state === "done";
          return (
            <li key={s.id} className={clsx("rounded-lg px-2 py-1.5", state === "active" && "bg-bp-50", state === "todo" && "opacity-40")}>
              <div className="flex items-center gap-2 text-[13px]">
                {state === "done" ? (
                  failed ? <TriangleAlert className="size-3.5 shrink-0 text-warn" /> : s.kind === "fix" ? <Wrench className="size-3.5 shrink-0 text-ok" /> : <Check className="size-3.5 shrink-0 text-ok" />
                ) : state === "active" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-bp" />
                ) : state === "paused" ? (
                  <Square className="size-3.5 shrink-0 text-ink-3" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border border-ink-3" />
                )}
                <span className={clsx(state === "active" && "font-medium")}>{failed ? "Checks found 1 type error" : s.title}</span>
              </div>
              {detail === "technical" && state !== "todo" && (
                <div className="ml-5.5 mt-1 space-y-0.5 border-l border-line pl-2.5 font-mono text-[11px] leading-4 text-ink-3">
                  {s.calls.map((c) => <p key={c} className={clsx(c.startsWith("✗") && "text-bad")}>{c}</p>)}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {paused && <p className="border-t border-line px-3 py-2 text-[12px] text-ink-2">Paused. Nothing is lost. The last restore point is safe. Resume when ready.</p>}
    </div>
  );
}

function ChatComposer({
  disabled,
  hint,
  onSend,
  selected,
  clearSelected,
}: {
  disabled: boolean;
  hint?: string;
  onSend: (t: string, attachments: Attachment[]) => void;
  selected: { id: string; label: string } | null;
  clearSelected: () => void;
}) {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    const { items, errors } = await readFiles(files, atts.length);
    setAtts((s) => [...s, ...items]);
    setErr(errors[0] ?? null);
  };
  useEffect(() => {
    if (selected) ref.current?.focus();
  }, [selected]);
  const send = () => {
    if ((!text.trim() && !atts.length) || disabled) return;
    onSend(text.trim() || "Use the attached files as a reference.", atts);
    setText("");
    setAtts([]);
    setErr(null);
  };
  return (
    <div className="shrink-0 border-t border-line p-3">
      <input ref={fileRef} type="file" multiple accept={`${FILE_ACCEPT},image/*`} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <div
        className={clsx("rounded-xl border bg-surface transition", disabled ? "border-line" : "border-line-strong focus-within:border-bp")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) add(e.dataTransfer.files);
        }}
      >
        {atts.length > 0 && (
          <div className="px-2.5 pt-2.5">
            <AttachmentChips items={atts} size="sm" onRemove={(id) => setAtts((s) => s.filter((x) => x.id !== id))} />
          </div>
        )}
        {selected && (
          <div className="flex items-center gap-1.5 px-3 pt-2.5">
            <span className="flex items-center gap-1 rounded-md bg-bp-50 px-1.5 py-0.5 text-[11.5px] font-medium text-bp">
              <MousePointerClick className="size-3" /> Editing: {selected.label}
              <button onClick={clearSelected} aria-label="Clear selection" className="ml-0.5 hover:text-ink"><X className="size-3" /></button>
            </span>
          </div>
        )}
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              add(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={disabled}
          rows={2}
          placeholder={disabled ? hint ?? "" : selected ? `What should change about the ${selected.label.toLowerCase()}?` : "Ask for a change, a new feature, or a fix…"}
          className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13.5px] outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink disabled:opacity-40" aria-label="Attach files or images" title="Attach files or images"><Paperclip className="size-3.5" /></button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setText((t) => (t.includes("@PLAN.md") ? t : `${t}${t && !t.endsWith(" ") ? " " : ""}@PLAN.md `));
              ref.current?.focus();
            }}
            className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink disabled:opacity-40"
            aria-label="Reference the plan"
            title="Reference PLAN.md"
          >
            <FileText className="size-3.5" />
          </button>
          <span className="ml-1 hidden text-[11px] text-ink-3 sm:inline">Enter to send · Shift+Enter for new line</span>
          <button onClick={send} disabled={disabled || (!text.trim() && !atts.length)} aria-label="Send" className="ml-auto grid size-7 place-items-center rounded-lg bg-bp text-white disabled:bg-line-strong">
            <ArrowUp className="size-4" />
          </button>
        </div>
        {err && <p className="px-3 pb-2 text-[11.5px] text-bad">{err}</p>}
      </div>
    </div>
  );
}
