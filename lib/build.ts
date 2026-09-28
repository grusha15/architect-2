import type { Plan } from "./types";

export type StepKind = "sandbox" | "scaffold" | "install" | "data" | "page" | "agent" | "integration" | "verify" | "fix" | "checkpoint";

export interface BuildStep {
  id: string;
  kind: StepKind;
  title: string;
  /** Technical detail shown in "Technical" detail mode */
  calls: string[];
  ms: number;
  /** What part of the preview becomes real once this step completes */
  reveal?: { type: "shell" } | { type: "page"; index: number } | { type: "agent" } | { type: "data" };
}

const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function buildSteps(plan: Plan): BuildStep[] {
  const steps: BuildStep[] = [
    {
      id: "sandbox",
      kind: "sandbox",
      title: "Starting a private workspace",
      calls: ["sandbox.claim(template=\"nextjs-fastapi\", region=\"us-east\")", "→ microVM sbx_7f3a ready in 212ms (warm pool)"],
      ms: 900,
    },
    {
      id: "scaffold",
      kind: "scaffold",
      title: "Laying out the project",
      calls: ["write_file PLAN.md", "write_file architect.toml", "write_file app/layout.tsx", "write_file api/main.py"],
      ms: 1100,
      reveal: { type: "shell" },
    },
    {
      id: "install",
      kind: "install",
      title: "Installing building blocks",
      calls: ["run_command pnpm install  (412 packages, 6.1s, cache hit)", `run_command uv add ${frameworkPkg(plan.framework)} fastapi`],
      ms: 1200,
    },
    {
      id: "data",
      kind: "data",
      title: `Creating your ${plan.data.map((d) => d.entity.toLowerCase()).join(" & ")} data`,
      calls: ["write_file db/schema.sql", "db_migrate --branch preview  (Neon branch br_preview_1)", "seed 24 sample rows"],
      ms: 900,
      reveal: { type: "data" },
    },
    ...plan.pages.map<BuildStep>((p, i) => ({
      id: `page-${i}`,
      kind: "page",
      title: `Designing the ${p.name} page`,
      calls: [`write_file ${i === 0 ? "app/page.tsx" : `app/${snake(p.name).replace(/_/g, "-")}/page.tsx`}`, "hmr: update applied (84ms)"],
      ms: 1300,
      reveal: { type: "page", index: i },
    })),
    ...plan.agents.map<BuildStep>((a) => ({
      id: `agent-${snake(a.name)}`,
      kind: "agent",
      title: `Teaching the ${a.name} agent`,
      calls: [`write_file prompts/${snake(a.name)}.md`, `register_tools [${a.tools.join(", ")}]`, `model = ${a.model}`],
      ms: 1000,
    })),
    {
      id: "agent-wire",
      kind: "agent",
      title: "Connecting agents into a workflow",
      calls: ["write_file agent.manifest.json", "write_file " + entryFor(plan.framework), "hmr: agent console mounted"],
      ms: 900,
      reveal: { type: "agent" },
    },
  ];
  if (plan.integrations.length) {
    steps.push({
      id: "integrations",
      kind: "integration",
      title: `Preparing ${plan.integrations.join(", ")} connections`,
      calls: plan.integrations.map((i) => `connector.stub("${i.toLowerCase().replace(/\s/g, "_")}")  → awaiting OAuth`),
      ms: 800,
    });
  }
  steps.push(
    {
      id: "verify-1",
      kind: "verify",
      title: "Checking everything works",
      calls: ["run_command pnpm typecheck", `✗ ${entryFor(plan.framework)}:42  Argument of type 'str | None' is not assignable`],
      ms: 1100,
    },
    {
      id: "fix",
      kind: "fix",
      title: "Found a small bug — fixed it automatically",
      calls: ["self_heal attempt 1/3 (error signature e3b0c4)", `apply_patch ${entryFor(plan.framework)} (+2 −1)`, "run_command pnpm typecheck  ✓"],
      ms: 1200,
    },
    {
      id: "verify-2",
      kind: "verify",
      title: "Testing the app like a user would",
      calls: ["run_command pytest -q  → 12 passed", "http GET /api/health → 200", "screenshot_preview → vision check: layout matches plan ✓"],
      ms: 1200,
    },
    {
      id: "checkpoint",
      kind: "checkpoint",
      title: "Saved a restore point",
      calls: ["git commit -m \"feat: initial build of " + plan.name + "\"  (a91c2e4)", "snapshot preview → thumbnail"],
      ms: 600,
    },
  );
  return steps;
}

function frameworkPkg(fw: string) {
  return (
    { "lyzr-adk": "lyzr-adk", langgraph: "langgraph", crewai: "crewai", "openai-agents": "openai-agents", "claude-agent-sdk": "@anthropic-ai/claude-agent-sdk" } as Record<string, string>
  )[fw];
}

function entryFor(fw: string) {
  return (
    { "lyzr-adk": "agents/workflow.py", langgraph: "agents/graph.py", crewai: "agents/crew.py", "openai-agents": "agents/agents.py", "claude-agent-sdk": "agents/index.ts" } as Record<string, string>
  )[fw];
}
