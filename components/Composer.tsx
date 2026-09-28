"use client";

import clsx from "clsx";
import { ArrowUp, ChevronDown, Image as ImageIcon, Paperclip, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FigmaIcon } from "./icons";
import { FRAMEWORKS, MODELS } from "@/lib/planner";
import type { Framework } from "@/lib/types";

export interface ComposerSubmit {
  prompt: string;
  framework?: Framework;
  model: string;
}

/** The prompt composer used on the landing page and the dashboard. */
export function Composer({
  onSubmit,
  busy,
  autoFocus,
  initial = "",
  placeholder = "Describe the app or agent you want to build…",
  size = "lg",
}: {
  onSubmit: (v: ComposerSubmit) => void;
  busy?: boolean;
  autoFocus?: boolean;
  initial?: string;
  placeholder?: string;
  size?: "lg" | "md";
}) {
  const [text, setText] = useState(initial);
  const [framework, setFramework] = useState<Framework | "auto">("auto");
  const [model, setModel] = useState("auto");
  const [attach, setAttach] = useState<string[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(initial);
  }, [initial]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(220, el.scrollHeight) + "px";
  }, [text]);

  const submit = () => {
    if (!text.trim() || busy) return;
    onSubmit({ prompt: text.trim(), framework: framework === "auto" ? undefined : framework, model });
  };

  const enhance = () => {
    if (!text.trim()) return;
    setEnhancing(true);
    setTimeout(() => {
      setText((t) =>
        t.trim().length > 140
          ? t
          : `${t.trim().replace(/\.$/, "")}. Include a dashboard with key metrics, a detail view for each record, role-based access for my team, and an agent that explains every decision it makes.`,
      );
      setEnhancing(false);
    }, 700);
  };

  return (
    <div className="rounded-2xl border border-line-strong bg-surface shadow-[0_1px_0_rgba(20,22,31,0.04),0_12px_40px_-16px_rgba(39,71,214,0.25)] focus-within:border-bp">
      {attach.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {attach.map((a) => (
            <span key={a} className="flex items-center gap-1 rounded-md bg-sunken px-2 py-1 text-[12px] text-ink-2">
              {a}
              <button className="text-ink-3 hover:text-ink" onClick={() => setAttach((s) => s.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder={placeholder}
        className={clsx("w-full resize-none bg-transparent px-4 pt-4 outline-none placeholder:text-ink-3", size === "lg" ? "min-h-[84px] text-[16px]" : "min-h-[64px] text-[15px]")}
      />
      <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5">
        <IconBtn label="Attach files" onClick={() => setAttach((s) => [...new Set([...s, "requirements.pdf"])])}>
          <Paperclip className="size-4" />
        </IconBtn>
        <IconBtn label="Add a screenshot" onClick={() => setAttach((s) => [...new Set([...s, "dashboard-mock.png"])])}>
          <ImageIcon className="size-4" />
        </IconBtn>
        <IconBtn label="Import from Figma" onClick={() => setAttach((s) => [...new Set([...s, "Figma: Onboarding v3"])])}>
          <FigmaIcon className="size-3.5" />
        </IconBtn>
        <button
          onClick={enhance}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-ink-2 hover:bg-sunken"
          title="Rewrite my prompt into a clearer spec"
        >
          <Wand2 className={clsx("size-3.5", enhancing && "animate-pulse text-bp")} /> Enhance
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Picker
            value={framework}
            onChange={(v) => setFramework(v as Framework | "auto")}
            options={[{ value: "auto", label: "Framework: Auto" }, ...FRAMEWORKS.map((f) => ({ value: f.id, label: f.label }))]}
          />
          <Picker value={model} onChange={setModel} options={MODELS.map((m) => ({ value: m.id, label: m.id === "auto" ? "Model: Auto" : m.label }))} />
          <button
            onClick={submit}
            disabled={!text.trim() || busy}
            className="ml-1 flex h-9 items-center gap-1.5 rounded-xl bg-bp pl-3.5 pr-3 text-[13.5px] font-medium text-white transition hover:bg-bp-600 disabled:bg-line-strong"
          >
            {busy ? <Sparkles className="size-4 animate-spin" /> : null}
            Build <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-sunken hover:text-ink">
      {children}
    </button>
  );
}

function Picker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="relative hidden sm:block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-2.5 pr-7 text-[12.5px] font-medium text-ink-2 outline-none hover:border-line-strong"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 size-3.5 text-ink-3" />
    </label>
  );
}
