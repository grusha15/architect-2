"use client";

import type { Attachment } from "./types";
import { uid } from "./store";

export const MAX_FILES = 8;
export const MAX_BYTES = 10 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|csv|json|ya?ml|py|ts|tsx|js|html|sql)$/i;
const TEXT_LIMIT = 4000;

export const FILE_ACCEPT = ".pdf,.txt,.md,.csv,.json,.yaml,.yml,.docx,.xlsx,.pptx,.py,.ts,.tsx,.js,.html,.sql";

function readAs(file: File, mode: "text" | "dataUrl"): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    if (mode === "text") r.readAsText(file);
    else r.readAsDataURL(file);
  });
}

/** Downscales an image to a small JPEG thumbnail so it can be stored with the project. */
async function thumbnail(file: File, max = 180): Promise<string> {
  const src = await readAs(file, "dataUrl");
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("bad image"));
    img.src = src;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function readFiles(files: FileList | File[], existing: number): Promise<{ items: Attachment[]; errors: string[] }> {
  const items: Attachment[] = [];
  const errors: string[] = [];
  for (const file of Array.from(files)) {
    if (existing + items.length >= MAX_FILES) {
      errors.push(`Up to ${MAX_FILES} attachments per message.`);
      break;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name} is over 10 MB.`);
      continue;
    }
    const isImage = file.type.startsWith("image/");
    const a: Attachment = { id: uid(), name: file.name, kind: isImage ? "image" : "file", size: file.size };
    try {
      if (isImage) a.preview = await thumbnail(file);
      else if (TEXT_EXT.test(file.name) || file.type.startsWith("text/")) a.text = (await readAs(file, "text")).slice(0, TEXT_LIMIT);
    } catch {
      errors.push(`Couldn't read ${file.name}.`);
      continue;
    }
    items.push(a);
  }
  return { items, errors };
}

export function figmaAttachment(url: string): Attachment | null {
  const m = url.trim().match(/^https:\/\/(www\.)?figma\.com\/(file|design|proto|board)\/([A-Za-z0-9]+)(\/([^?#]+))?/);
  if (!m) return null;
  const name = m[5] ? decodeURIComponent(m[5]).replace(/-/g, " ") : `Figma ${m[3].slice(0, 6)}`;
  return { id: uid(), name, kind: "figma", url: url.trim() };
}

export function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Text the planner can use: extracted text files, plus names of images and Figma links. */
export function attachmentContext(atts: Attachment[] = []) {
  return atts
    .map((a) =>
      a.kind === "figma" ? `Figma design: ${a.url}` : a.text ? `File "${a.name}":\n${a.text}` : a.kind === "image" ? `Image attached: ${a.name}` : `File attached: ${a.name}`,
    )
    .join("\n\n");
}
