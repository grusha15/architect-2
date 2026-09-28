"use client";

import clsx from "clsx";
import { FileText, X } from "lucide-react";
import { formatSize } from "@/lib/attachments";
import type { Attachment } from "@/lib/types";
import { FigmaIcon } from "./icons";

export function AttachmentChips({ items, onRemove, size = "md" }: { items: Attachment[]; onRemove?: (id: string) => void; size?: "sm" | "md" }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a) => (
        <span key={a.id} className={clsx("group relative flex max-w-[220px] items-center gap-2 rounded-lg border border-line bg-surface pr-2", size === "md" ? "h-11 pl-1" : "h-9 pl-1")}>
          {a.kind === "image" && a.preview ? (
            <img src={a.preview} alt="" className={clsx("rounded-md object-cover", size === "md" ? "size-9" : "size-7")} />
          ) : (
            <span className={clsx("grid place-items-center rounded-md bg-sunken", size === "md" ? "size-9" : "size-7")}>
              {a.kind === "figma" ? <FigmaIcon className="size-3.5" /> : <FileText className="size-4 text-ink-2" />}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-ink">{a.name}</span>
            <span className="block text-[10.5px] text-ink-3">{a.kind === "figma" ? "Figma link" : a.text ? `${formatSize(a.size)} · text read` : formatSize(a.size)}</span>
          </span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(a.id)} aria-label={`Remove ${a.name}`} className="ml-0.5 rounded p-0.5 text-ink-3 hover:bg-sunken hover:text-ink">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
