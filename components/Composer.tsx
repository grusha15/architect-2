"use client";

import clsx from "clsx";
import { ArrowUp, ChevronDown, Image as ImageIcon, Paperclip, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FigmaIcon } from "./icons";
import { FRAMEWORKS, MODELS } from "@/lib/planner";
import type { Attachment, Framework } from "@/lib/types";
import { FILE_ACCEPT, figmaAttachment, readFiles } from "@/lib/attachments";
import { AttachmentChips } from "./Attachments";

export interface ComposerSubmit {
  prompt: string;
  framework?: Framework;
  model: string;
  attachments: Attachment[];
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
  const [attach, setAttach] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    const { items, errors } = await readFiles(files, attach.length);
    setAttach((s) => [...s, ...items]);
    setError(errors[0] ?? null);
  };

  const addFigma = () => {
    const a = figmaAttachment(figmaUrl);
    if (!a) {
      setError("That doesn't look like a Figma link (figma.com/design/… or /file/…).");
      return;
    }
    setAttach((s) => [...s, a]);
    setFigmaUrl("");
    setFigmaOpen(false);
    setError(null);
  };
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
    onSubmit({ prompt: text.trim(), framework: framework === "auto" ? undefined : framework, model, attachments: attach });
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
    <div
      className={clsx(
        "relative rounded-2xl border bg-surface shadow-[0_1px_0_rgba(20,22,31,0.04),0_12px_40px_-16px_rgba(39,71,214,0.25)] focus-within:border-bp",
        dragging ? "border-bp ring-4 ring-bp-50" : "border-line-strong",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input ref={fileRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={imageRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      {dragging && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-bp-50/80 text-[13.5px] font-medium text-bp">Drop files to attach</div>}
      {attach.length > 0 && (
        <div className="px-3 pt-3">
          <AttachmentChips items={attach} onRemove={(id) => setAttach((s) => s.filter((x) => x.id !== id))} />
        </div>
      )}
      <textarea
        ref={ref}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files);
          if (files.length) {
            e.preventDefault();
            addFiles(files);
          }
        }}
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
        <IconBtn label="Attach files (PDF, docs, CSV, code)" onClick={() => fileRef.current?.click()}>
          <Paperclip className="size-4" />
        </IconBtn>
        <IconBtn label="Add images or screenshots" onClick={() => imageRef.current?.click()}>
          <ImageIcon className="size-4" />
        </IconBtn>
        <div className="relative">
          <IconBtn label="Add a Figma link" onClick={() => setFigmaOpen((v) => !v)}>
            <FigmaIcon className="size-3.5" />
          </IconBtn>
          {figmaOpen && (
            <div className="absolute left-0 top-10 z-20 w-80 rounded-xl border border-line bg-surface p-3 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-medium">Paste a Figma link</p>
                <button onClick={() => setFigmaOpen(false)} aria-label="Close" className="rounded p-0.5 text-ink-3 hover:text-ink"><X className="size-3.5" /></button>
              </div>
              <form
                className="mt-2 flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addFigma();
                }}
              >
                <input autoFocus value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="https://www.figma.com/design/…" className="h-8 min-w-0 flex-1 rounded-lg border border-line px-2.5 text-[12.5px] outline-none focus:border-bp" />
                <button type="submit" className="h-8 rounded-lg bg-ink px-2.5 text-[12.5px] font-medium text-white">Add</button>
              </form>
              <p className="mt-1.5 text-[11px] text-ink-3">We use the frames as a visual reference for the UI.</p>
            </div>
          )}
        </div>
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
      {error && <p className="px-4 pb-2.5 text-left text-[12px] text-bad">{error}</p>}
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
