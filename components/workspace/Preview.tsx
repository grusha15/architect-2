"use client";

import clsx from "clsx";
import { useState } from "react";
import { ExternalLink, Lock, Monitor, MousePointerClick, RotateCw, Smartphone, SquareTerminal, Tablet, X } from "lucide-react";
import type { Plan, PreviewState } from "@/lib/types";
import { GeneratedApp, type Revealed } from "./GeneratedApp";

type Device = "desktop" | "tablet" | "mobile";

export function Preview({
  plan,
  preview,
  revealed,
  building,
  editMode,
  setEditMode,
  selectedId,
  onSelect,
  sandboxId,
  liveUrl,
  logs,
}: {
  plan: Plan | null;
  preview: PreviewState;
  revealed: Revealed;
  building: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string, label: string) => void;
  sandboxId: string;
  liveUrl?: string;
  logs: string[];
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const path = plan && page > 0 ? `/${plan.pages[page].name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "/";

  return (
    <div className="flex h-full min-h-0 flex-col bg-sunken/60">
      {/* Browser chrome */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
          {([
            ["desktop", Monitor],
            ["tablet", Tablet],
            ["mobile", Smartphone],
          ] as const).map(([d, Icon]) => (
            <button key={d} onClick={() => setDevice(d)} aria-label={`${d} preview`} className={clsx("rounded-md p-1", device === d ? "bg-sunken text-ink" : "text-ink-3 hover:text-ink")}>
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
        <button onClick={() => setReloadKey((k) => k + 1)} aria-label="Reload preview" className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink">
          <RotateCw className="size-3.5" />
        </button>
        <div className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-sunken px-2.5 font-mono text-[11.5px] text-ink-2">
          <Lock className="size-3 shrink-0 text-ok" />
          <span className="truncate">
            {sandboxId}-3000.preview.architect.app<span className="text-ink">{path}</span>
          </span>
          {building && <span className="ml-auto flex shrink-0 items-center gap-1 text-bp"><span className="size-1.5 animate-pulse rounded-full bg-bp" /> HMR</span>}
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          disabled={!plan || building}
          className={clsx(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition disabled:opacity-40",
            editMode ? "bg-bp text-white" : "border border-line text-ink-2 hover:border-line-strong",
          )}
          title="Click any element in the preview to change it"
        >
          <MousePointerClick className="size-3.5" /> {editMode ? "Selecting…" : "Visual edit"}
        </button>
        <button onClick={() => setConsoleOpen((v) => !v)} aria-label="Toggle console" className={clsx("rounded-md p-1.5 hover:bg-sunken", consoleOpen ? "text-bp" : "text-ink-3")}>
          <SquareTerminal className="size-3.5" />
        </button>
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noreferrer" aria-label="Open live app" className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink">
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {editMode && (
        <div className="flex items-center gap-2 border-b border-bp-100 bg-bp-50 px-3 py-1.5 text-[12.5px] text-bp">
          <MousePointerClick className="size-3.5" /> Click any element, then describe the change in chat. Press Esc to stop.
          <button onClick={() => setEditMode(false)} className="ml-auto rounded p-0.5 hover:bg-bp-100" aria-label="Exit visual edit"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Canvas */}
      <div className="bp-grid-fine relative min-h-0 flex-1 overflow-auto p-4">
        {!plan ? (
          <EmptyPreview />
        ) : (
          <div
            key={reloadKey}
            className={clsx(
              "anim-rise mx-auto h-full overflow-hidden border border-line-strong bg-white shadow-[0_20px_60px_-30px_rgba(20,22,31,0.35)] transition-all",
              device === "desktop" && "w-full max-w-[1200px] rounded-lg",
              device === "tablet" && "w-[768px] max-w-full rounded-2xl",
              device === "mobile" && "w-[390px] max-w-full rounded-[28px] border-[6px] border-ink",
            )}
          >
            <div className="h-full overflow-auto">
              <GeneratedApp
                plan={plan}
                preview={preview}
                revealed={revealed}
                editMode={editMode}
                selectedId={selectedId}
                onSelect={onSelect}
                page={page}
                setPage={setPage}
                narrow={device === "mobile"}
              />
            </div>
          </div>
        )}
      </div>

      {consoleOpen && (
        <div className="scroll-night h-40 shrink-0 overflow-y-auto border-t border-night-line bg-night px-3 py-2 font-mono text-[11.5px] leading-5 text-white/70">
          {logs.length === 0 ? <p className="text-white/40">No console output yet.</p> : logs.map((l, i) => <p key={i} className={l.includes("✗") || l.includes("error") ? "text-rose-300" : l.includes("✓") ? "text-emerald-300" : ""}>{l}</p>)}
        </div>
      )}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="grid h-full place-items-center">
      <div className="max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-dashed border-bp/40 bg-bp-50">
          <Monitor className="size-6 text-bp" />
        </div>
        <p className="mt-4 font-medium">Your app will appear here</p>
        <p className="mt-1 text-[13px] text-ink-2">Once you approve the plan, you&apos;ll watch it being built — page by page, live.</p>
      </div>
    </div>
  );
}
