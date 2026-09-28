export type Framework = "lyzr-adk" | "langgraph" | "crewai" | "openai-agents" | "claude-agent-sdk";

export type ViewMode = "preview" | "code" | "agents";

export type Role = "builder" | "developer" | "both";

export interface PlanPage {
  name: string;
  description: string;
}

export interface PlanAgent {
  name: string;
  role: string;
  tools: string[];
  model: string;
}

export interface PlanEntity {
  entity: string;
  fields: string[];
}

export interface Plan {
  name: string;
  summary: string;
  domain: string;
  framework: Framework;
  stack: { frontend: string; backend: string; database: string };
  pages: PlanPage[];
  agents: PlanAgent[];
  data: PlanEntity[];
  integrations: string[];
  secrets: string[];
  estimate: { minutes: number; credits: number };
}

export interface PreviewState {
  accent: string;
  dark: boolean;
  radius: "sharp" | "soft" | "round";
  headline?: string;
  extraSections: string[];
}

export interface Checkpoint {
  id: string;
  title: string;
  detail: string;
  at: string;
  files: number;
  preview: PreviewState;
}

export interface Deployment {
  id: string;
  env: "preview" | "production";
  target: string;
  url: string;
  commit: string;
  at: string;
  status: "live" | "superseded" | "rolled-back";
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  at: string;
}

export interface GitState {
  repo: string;
  branch: string;
  visibility: "private" | "public";
  lastPush?: string;
  prs: { number: number; title: string; status: "open" | "merged" }[];
  ahead: number;
}

export interface SecretEntry {
  key: string;
  last4: string;
  addedAt: string;
}

export type ProjectStatus = "draft" | "planning" | "building" | "ready" | "live" | "error";

export interface ProjectData {
  prompt: string;
  source: "prompt" | "import" | "template" | "blank";
  model: string;
  plan: Plan | null;
  planSource?: "llm" | "fallback";
  answers?: Record<string, string>;
  messages: ChatMessage[];
  checkpoints: Checkpoint[];
  deployments: Deployment[];
  preview: PreviewState;
  git: GitState | null;
  secrets: SecretEntry[];
  integrations: string[];
  importedFrom?: { repo: string; stack: string };
  built: boolean;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  slug: string | null;
  published: boolean;
  data: ProjectData;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  role: Role;
  default_view: ViewMode;
  full_name?: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}
