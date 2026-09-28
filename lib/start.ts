"use client";

import { createProject } from "./store";
import { fallbackPlan } from "./planner";
import type { Framework, ProjectData } from "./types";

const PENDING = "architect.pending";

export interface PendingStart {
  prompt: string;
  source: ProjectData["source"];
  framework?: Framework;
  model?: string;
}

export function savePending(p: PendingStart) {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify(p));
  } catch {}
}

export function takePending(): PendingStart | null {
  try {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return raw ? (JSON.parse(raw) as PendingStart) : null;
  } catch {
    return null;
  }
}

export function peekPending(): PendingStart | null {
  try {
    const raw = sessionStorage.getItem(PENDING);
    return raw ? (JSON.parse(raw) as PendingStart) : null;
  } catch {
    return null;
  }
}

/** Creates a project from a prompt and returns its id. The workspace takes over from there. */
export async function startProject(p: PendingStart): Promise<string> {
  const name = p.prompt ? fallbackPlan(p.prompt).name : "Untitled project";
  const project = await createProject(name, {
    prompt: p.prompt,
    source: p.source,
    model: p.model ?? "auto",
    answers: p.framework ? { framework: p.framework } : undefined,
  });
  return project.id;
}
