"use client";

/**
 * Persistence layer. Uses Supabase Postgres (with row-level security) when configured,
 * and falls back to localStorage so every flow still works in demo mode.
 */
import { getSupabase } from "./supabase";
import type { Profile, Project, ProjectData } from "./types";
import { defaultPreview } from "./planner";

const LS_PROJECTS = "architect.projects";
const LS_PROFILE = "architect.profile";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function lsRead(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(LS_PROJECTS) ?? "[]") as Project[];
  } catch {
    return [];
  }
}

function lsWrite(list: Project[]) {
  try {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(list));
  } catch {}
}

export function emptyData(partial: Partial<ProjectData> = {}): ProjectData {
  return {
    prompt: "",
    source: "prompt",
    model: "auto",
    plan: null,
    messages: [],
    checkpoints: [],
    deployments: [],
    preview: defaultPreview(),
    git: null,
    secrets: [],
    integrations: [],
    built: false,
    ...partial,
  };
}

export async function listProjects(): Promise<Project[]> {
  const sb = getSupabase();
  if (!sb) return lsRead().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const { data, error } = await sb.from("projects").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const sb = getSupabase();
  if (!sb) return lsRead().find((p) => p.id === id) ?? null;
  const { data, error } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function getPublishedBySlug(slug: string): Promise<Project | null> {
  const sb = getSupabase();
  if (!sb) return lsRead().find((p) => p.slug === slug) ?? null;
  const { data } = await sb.from("projects").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return (data as Project) ?? null;
}

export async function createProject(name: string, data: Partial<ProjectData>): Promise<Project> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  const payload = { name, status: "draft" as const, slug: null, published: false, data: emptyData(data) };
  if (!sb) {
    const p: Project = { id: uid(), created_at: now, updated_at: now, ...payload };
    lsWrite([p, ...lsRead()]);
    return p;
  }
  const { data: row, error } = await sb.from("projects").insert(payload).select("*").single();
  if (error) throw error;
  return row as Project;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "status" | "slug" | "published" | "data">>,
): Promise<void> {
  const sb = getSupabase();
  const updated_at = new Date().toISOString();
  if (!sb) {
    lsWrite(lsRead().map((p) => (p.id === id ? { ...p, ...patch, updated_at } : p)));
    return;
  }
  const { error } = await sb.from("projects").update({ ...patch, updated_at }).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    lsWrite(lsRead().filter((p) => p.id !== id));
    return;
  }
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) {
    try {
      const raw = localStorage.getItem(LS_PROFILE);
      return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      return null;
    }
  }
  const { data } = await sb.from("profiles").select("role, default_view, full_name").eq("id", userId).maybeSingle();
  return (data as Profile) ?? null;
}

export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    try {
      localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    } catch {}
    return;
  }
  const { error } = await sb.from("profiles").upsert({ id: userId, ...profile });
  if (error) throw error;
}

export { uid };
