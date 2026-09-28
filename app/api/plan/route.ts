import { NextResponse } from "next/server";
import { complete, extractJson } from "@/lib/gateway";
import { fallbackPlan } from "@/lib/planner";
import type { Framework, Plan } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You are the planning agent of Architect, a platform that builds agentic web apps.
Turn the user's idea into a concise build plan. Respond with ONLY a JSON object:
{
  "name": string (2-4 words, product name),
  "summary": string (one sentence, plain English, no jargon),
  "pages": [{"name": string, "description": string}] (2-4 items),
  "agents": [{"name": string (one word), "role": string, "tools": string[] (snake_case), "model": string}] (2-4 items, sequential workflow),
  "data": [{"entity": string (singular, PascalCase), "fields": string[] (5-6 snake_case, include status and a *_at timestamp)}] (1 item),
  "integrations": string[] (0-3 product names, e.g. Slack),
  "secrets": string[] (ENV_VAR names the integrations need)
}`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    answers?: Record<string, string>;
    model?: string;
    framework?: Framework;
  };
  const prompt = (body.prompt ?? "").slice(0, 2000);
  const base = fallbackPlan(prompt, body.answers, body.framework);
  if (!prompt) return NextResponse.json({ plan: base, source: "fallback" });

  try {
    const answers = body.answers ? `\nClarifications: ${JSON.stringify(body.answers)}` : "";
    const { text, provider, model } = await complete(body.model ?? "auto", {
      system: SYSTEM,
      user: `Idea: ${prompt}${answers}`,
      json: true,
    });
    const llm = extractJson<Partial<Plan>>(text);
    if (!llm?.name || !llm.pages?.length || !llm.agents?.length || !llm.data?.length) throw new Error("bad plan shape");
    const plan: Plan = {
      ...base,
      name: llm.name,
      summary: llm.summary ?? base.summary,
      pages: llm.pages.slice(0, 4),
      agents: llm.agents.slice(0, 4).map((a) => ({ ...a, tools: a.tools?.length ? a.tools : ["reasoning"], model: a.model || "claude-sonnet-5" })),
      data: llm.data.slice(0, 1),
      integrations: llm.integrations ?? base.integrations,
      secrets: llm.secrets ?? base.secrets,
      domain: "llm",
    };
    plan.estimate = { minutes: 2 + plan.pages.length, credits: 8 + plan.agents.length * 3 + plan.pages.length * 2 };
    return NextResponse.json({ plan, source: "llm", provider, model });
  } catch (e) {
    return NextResponse.json({ plan: base, source: "fallback", reason: (e as Error).message.slice(0, 120) });
  }
}
