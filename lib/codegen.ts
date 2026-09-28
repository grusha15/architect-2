import type { Framework, Plan } from "./types";

export interface GenFile {
  path: string;
  language: string;
  content: string;
}

const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const pascal = (s: string) => s.replace(/[^a-z0-9]+/gi, " ").trim().split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function agentCode(plan: Plan, fw: Framework): GenFile {
  const a = plan.agents;
  switch (fw) {
    case "langgraph":
      return {
        path: "agents/graph.py",
        language: "python",
        content: `from typing import TypedDict
from langgraph.graph import StateGraph, END
from architect.runtime import llm, tools

class State(TypedDict):
    input: dict
    result: dict
    trace: list

${a
  .map(
    (x) => `def ${snake(x.name)}(state: State) -> State:
    """${x.role}"""
    out = llm("${x.model}").invoke(
        system=open("prompts/${snake(x.name)}.md").read(),
        input=state,
        tools=[${x.tools.map((t) => `tools.${t}`).join(", ")}],
    )
    return {**state, "result": {**state["result"], "${snake(x.name)}": out}}
`,
  )
  .join("\n")}
graph = StateGraph(State)
${a.map((x) => `graph.add_node("${snake(x.name)}", ${snake(x.name)})`).join("\n")}
graph.set_entry_point("${snake(a[0].name)}")
${a
  .slice(0, -1)
  .map((x, i) => `graph.add_edge("${snake(x.name)}", "${snake(a[i + 1].name)}")`)
  .join("\n")}
graph.add_edge("${snake(a[a.length - 1].name)}", END)
app = graph.compile(checkpointer=True)
`,
      };
    case "crewai":
      return {
        path: "agents/crew.py",
        language: "python",
        content: `from crewai import Agent, Task, Crew, Process
from architect.runtime import tools, model

${a
  .map(
    (x) => `${snake(x.name)} = Agent(
    role="${x.name}",
    goal="${x.role}",
    backstory="You are the ${x.name.toLowerCase()} in ${plan.name}.",
    tools=[${x.tools.map((t) => `tools.${t}`).join(", ")}],
    llm=model("${x.model}"),
)
`,
  )
  .join("\n")}
tasks = [
${a.map((x) => `    Task(description="${x.role}", agent=${snake(x.name)}, expected_output="JSON"),`).join("\n")}
]

crew = Crew(agents=[${a.map((x) => snake(x.name)).join(", ")}], tasks=tasks, process=Process.sequential)
`,
      };
    case "openai-agents":
      return {
        path: "agents/agents.py",
        language: "python",
        content: `from agents import Agent, Runner, function_tool
from architect.runtime import tools, model

${a
  .slice()
  .reverse()
  .map(
    (x, i, arr) => `${snake(x.name)} = Agent(
    name="${x.name}",
    instructions="${x.role}",
    model=model("${x.model}"),
    tools=[${x.tools.map((t) => `function_tool(tools.${t})`).join(", ")}],${i > 0 ? `\n    handoffs=[${snake(arr[i - 1].name)}],` : ""}
)
`,
  )
  .join("\n")}
async def run(payload: dict):
    return await Runner.run(${snake(a[0].name)}, input=payload)
`,
      };
    case "claude-agent-sdk":
      return {
        path: "agents/index.ts",
        language: "typescript",
        content: `import { query, type AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { tools } from "../architect/runtime";

const agents: Record<string, AgentDefinition> = {
${a
  .map(
    (x) => `  "${slug(x.name)}": {
    description: "${x.role}",
    prompt: await Bun.file("prompts/${snake(x.name)}.md").text(),
    tools: [${x.tools.map((t) => `"${t}"`).join(", ")}],
    model: "${x.model}",
  },`,
  )
  .join("\n")}
};

export async function run(input: string) {
  for await (const msg of query({ prompt: input, options: { agents, mcpServers: tools.mcp() } })) {
    if (msg.type === "result") return msg;
  }
}
`,
      };
    default:
      return {
        path: "agents/workflow.py",
        language: "python",
        content: `from lyzr_adk import Agent, Workflow, Memory, Guardrails
from architect.runtime import tools

${a
  .map(
    (x) => `${snake(x.name)} = Agent(
    name="${x.name}",
    instructions=open("prompts/${snake(x.name)}.md").read(),
    model="${x.model}",
    tools=[${x.tools.map((t) => `tools.${t}`).join(", ")}],
    memory=Memory(kind="short_term"),
    guardrails=Guardrails(pii_redaction=True, toxicity=True),
)
`,
  )
  .join("\n")}
workflow = Workflow(name="${slug(plan.name)}", steps=[${a.map((x) => snake(x.name)).join(", ")}])
`,
      };
  }
}

export function generateFiles(plan: Plan): GenFile[] {
  const ent = plan.data[0];
  const files: GenFile[] = [
    {
      path: "PLAN.md",
      language: "markdown",
      content: `# ${plan.name}\n\n${plan.summary}\n\n## Pages\n${plan.pages.map((p) => `- **${p.name}** — ${p.description}`).join("\n")}\n\n## Agents (${plan.framework})\n${plan.agents.map((a) => `- **${a.name}** (${a.model}) — ${a.role}`).join("\n")}\n\n## Data\n${plan.data.map((d) => `- ${d.entity}: ${d.fields.join(", ")}`).join("\n")}\n\n## Integrations\n${plan.integrations.map((i) => `- ${i}`).join("\n")}\n`,
    },
    {
      path: "architect.toml",
      language: "ini",
      content: `[project]\nname = "${slug(plan.name)}"\nframework = "${plan.framework}"\n\n[dev]\ninstall = "pnpm install && uv sync"\ncommand = "pnpm dev & uvicorn api.main:app --port 8000"\nport = 3000\n\n[test]\ncommand = "pnpm test && pytest -q"\n\n[deploy]\ntarget = "architect-cloud"\nhealthcheck = "/api/health"\n\n[secrets]\nrequired = [${plan.secrets.map((s) => `"${s}"`).join(", ")}]\n`,
    },
    {
      path: "agent.manifest.json",
      language: "json",
      content: JSON.stringify(
        {
          name: slug(plan.name),
          framework: plan.framework,
          entry: agentCode(plan, plan.framework).path,
          agents: plan.agents.map((a) => ({ id: snake(a.name), model: a.model, tools: a.tools })),
          edges: plan.agents.slice(0, -1).map((a, i) => [snake(a.name), snake(plan.agents[i + 1].name)]),
        },
        null,
        2,
      ),
    },
    agentCode(plan, plan.framework),
    ...plan.agents.map((a) => ({
      path: `prompts/${snake(a.name)}.md`,
      language: "markdown",
      content: `You are **${a.name}**, part of ${plan.name}.\n\nGoal: ${a.role}.\n\nRules:\n- Only use the tools provided: ${a.tools.join(", ")}.\n- Return strict JSON matching the schema.\n- If information is missing, say so instead of guessing.\n`,
    })),
    {
      path: "api/main.py",
      language: "python",
      content: `from fastapi import FastAPI, UploadFile
from agents import run_workflow
from db import session, ${pascal(ent.entity)}

app = FastAPI(title="${plan.name}")

@app.get("/api/health")
def health():
    return {"ok": True}

@app.get("/api/${snake(ent.entity)}s")
def list_items():
    return session.query(${pascal(ent.entity)}).order_by(${pascal(ent.entity)}.${ent.fields[ent.fields.length - 1]}.desc()).all()

@app.post("/api/run")
async def run(payload: dict):
    return await run_workflow(payload)
`,
    },
    {
      path: "db/schema.sql",
      language: "sql",
      content: plan.data
        .map(
          (d) =>
            `create table ${snake(d.entity)}s (\n  id uuid primary key default gen_random_uuid(),\n${d.fields
              .map((f) => `  ${f} ${/_at$|date/.test(f) ? "timestamptz" : /score|amount|tokens|sources/.test(f) ? "numeric" : "text"}`)
              .join(",\n")}\n);`,
        )
        .join("\n\n"),
    },
    ...plan.pages.map((p, i) => ({
      path: i === 0 ? "app/page.tsx" : `app/${slug(p.name)}/page.tsx`,
      language: "typescript",
      content: `import { ${i === 0 ? "DataTable, StatCard" : "Panel"} } from "@/components/ui";
import { AgentConsole } from "@/components/agent-console";

// ${p.description}
export default async function ${pascal(p.name)}Page() {
  const rows = await fetch(process.env.API_URL + "/api/${snake(ent.entity)}s").then((r) => r.json());
  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-semibold">${p.name}</h1>
${
  i === 0
    ? `      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Needs attention" value={rows.filter((r) => r.status !== "Done").length} />
        <StatCard label="Automated" value="86%" />
      </div>
      <DataTable rows={rows} columns={${JSON.stringify(ent.fields)}} />`
    : `      <Panel rows={rows} />`
}
      <AgentConsole workflow="${slug(plan.name)}" />
    </main>
  );
}
`,
    })),
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify(
        {
          name: slug(plan.name),
          private: true,
          scripts: { dev: "next dev", build: "next build", test: "vitest run" },
          dependencies: { next: "15.5.0", react: "19.0.0", "@architect/runtime": "^2.0.0" },
        },
        null,
        2,
      ),
    },
  ];
  return files;
}
