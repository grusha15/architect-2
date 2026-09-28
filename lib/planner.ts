import type { Framework, Plan, PreviewState } from "./types";

export const FRAMEWORKS: { id: Framework; label: string; lang: string; blurb: string }[] = [
  { id: "lyzr-adk", label: "Lyzr ADK", lang: "Python", blurb: "Managed agents with built-in memory, RAG and guardrails" },
  { id: "langgraph", label: "LangGraph", lang: "Python", blurb: "Stateful graphs, explicit control flow, checkpoints" },
  { id: "crewai", label: "CrewAI", lang: "Python", blurb: "Role-based crews of collaborating agents" },
  { id: "openai-agents", label: "OpenAI Agents SDK", lang: "Python", blurb: "Handoffs, guardrails and tracing" },
  { id: "claude-agent-sdk", label: "Claude Agent SDK", lang: "TypeScript", blurb: "Tool-use loop, subagents, MCP" },
];

export const MODELS: { id: string; label: string; provider: string; note: string }[] = [
  { id: "auto", label: "Auto", provider: "router", note: "Routes planning to frontier models, edits to fast ones" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "anthropic", note: "Best for planning & hard debugging" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", provider: "anthropic", note: "Balanced coding default" },
  { id: "gpt-5", label: "GPT-5", provider: "openai", note: "Strong generalist" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google", note: "Long context, multimodal" },
  { id: "llama-4-maverick", label: "Llama 4 Maverick", provider: "open-source", note: "Self-hosted via vLLM" },
  { id: "qwen3-coder", label: "Qwen3 Coder", provider: "open-source", note: "Open-weights coding model" },
];

export function defaultPreview(): PreviewState {
  return { accent: "#2747d6", dark: false, radius: "soft", extraSections: [] };
}

type Domain = Omit<Plan, "framework" | "estimate" | "summary"> & { summary: (p: string) => string };

const DOMAINS: { keys: RegExp; build: () => Domain }[] = [
  {
    keys: /kyc|compliance|document|onboard(ing)? (customer|client)|identity|verification/i,
    build: () => ({
      name: "KYC Review Desk",
      domain: "kyc",
      summary: () => "Upload customer documents, let agents extract fields, validate them against policy and flag gaps for a reviewer.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
      pages: [
        { name: "Review queue", description: "All submissions with risk score and status" },
        { name: "Case detail", description: "Document viewer with extracted fields side by side" },
        { name: "Insights", description: "Throughput, approval rate and common gaps" },
      ],
      agents: [
        { name: "Extractor", role: "Reads IDs, proofs of address and bank statements into structured fields", tools: ["ocr", "pdf_reader"], model: "gemini-2.5-pro" },
        { name: "Validator", role: "Checks fields against KYC policy and sanctions lists", tools: ["policy_rag", "sanctions_api"], model: "claude-sonnet-5" },
        { name: "Notifier", role: "Summarises the decision and pings the reviewer", tools: ["slack"], model: "gpt-5-mini" },
      ],
      data: [{ entity: "Submission", fields: ["customer", "document_type", "risk_score", "status", "missing_fields", "submitted_at"] }],
      integrations: ["Slack", "Google Drive"],
      secrets: ["SLACK_BOT_TOKEN"],
    }),
  },
  {
    keys: /support|ticket|helpdesk|customer service|zendesk|triage/i,
    build: () => ({
      name: "Support Triage Desk",
      domain: "support",
      summary: () => "Incoming tickets are classified, prioritised and drafted a reply automatically; humans approve with one click.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
      pages: [
        { name: "Inbox", description: "Tickets sorted by AI priority with suggested replies" },
        { name: "Ticket", description: "Conversation, customer context and the drafted answer" },
        { name: "Insights", description: "Volume, deflection rate and sentiment trends" },
      ],
      agents: [
        { name: "Classifier", role: "Tags intent, urgency and sentiment for every ticket", tools: ["taxonomy"], model: "gpt-5-mini" },
        { name: "Responder", role: "Drafts grounded replies from the help-centre knowledge base", tools: ["kb_search", "order_lookup"], model: "claude-sonnet-5" },
        { name: "Escalator", role: "Routes risky or VIP tickets to the right human", tools: ["slack", "pagerduty"], model: "gpt-5-mini" },
      ],
      data: [{ entity: "Ticket", fields: ["customer", "subject", "priority", "status", "sentiment", "created_at"] }],
      integrations: ["Zendesk", "Slack"],
      secrets: ["ZENDESK_API_TOKEN", "SLACK_BOT_TOKEN"],
    }),
  },
  {
    keys: /sales|lead|crm|outreach|prospect|pipeline|sdr/i,
    build: () => ({
      name: "Pipeline Copilot",
      domain: "sales",
      summary: () => "Enrich inbound leads, score fit, and draft personalised outreach that reps can send from one screen.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
      pages: [
        { name: "Leads", description: "Scored leads with enrichment and next best action" },
        { name: "Sequences", description: "AI-drafted outreach steps per lead" },
        { name: "Forecast", description: "Pipeline by stage and win probability" },
      ],
      agents: [
        { name: "Researcher", role: "Enriches company and person data from the web", tools: ["web_search", "clearbit"], model: "gemini-2.5-pro" },
        { name: "Scorer", role: "Scores ICP fit and buying intent", tools: ["crm_read"], model: "gpt-5-mini" },
        { name: "Writer", role: "Drafts personalised emails in the rep's voice", tools: ["gmail_draft"], model: "claude-sonnet-5" },
      ],
      data: [{ entity: "Lead", fields: ["name", "company", "fit_score", "stage", "owner", "last_touch"] }],
      integrations: ["HubSpot", "Gmail"],
      secrets: ["HUBSPOT_TOKEN"],
    }),
  },
  {
    keys: /recruit|hiring|resume|candidate|interview|talent|hr\b/i,
    build: () => ({
      name: "Talent Screener",
      domain: "recruiting",
      summary: () => "Parse resumes, match them to open roles, and schedule interviews for the strongest candidates.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
      pages: [
        { name: "Candidates", description: "Ranked candidates per role with match reasons" },
        { name: "Roles", description: "Open roles and their scorecards" },
        { name: "Schedule", description: "Interview slots booked by the agent" },
      ],
      agents: [
        { name: "Parser", role: "Turns resumes into structured profiles", tools: ["pdf_reader"], model: "gpt-5-mini" },
        { name: "Matcher", role: "Scores candidates against role scorecards", tools: ["vector_search"], model: "claude-sonnet-5" },
        { name: "Scheduler", role: "Books interviews on the panel's calendars", tools: ["google_calendar", "gmail"], model: "gpt-5-mini" },
      ],
      data: [{ entity: "Candidate", fields: ["name", "role", "match_score", "stage", "email", "applied_at"] }],
      integrations: ["Google Calendar", "Gmail"],
      secrets: ["GOOGLE_OAUTH_CLIENT"],
    }),
  },
  {
    keys: /research|news|report|market|analy(st|sis)|competitor|summar/i,
    build: () => ({
      name: "Research Analyst",
      domain: "research",
      summary: () => "Agents search, read and synthesise sources into cited briefings delivered on a schedule.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres + pgvector" },
      pages: [
        { name: "Briefings", description: "Generated reports with citations" },
        { name: "Sources", description: "Tracked feeds, sites and documents" },
        { name: "Ask", description: "Chat over everything collected" },
      ],
      agents: [
        { name: "Scout", role: "Finds and fetches relevant sources", tools: ["web_search", "rss"], model: "gpt-5-mini" },
        { name: "Reader", role: "Extracts claims and evidence", tools: ["browser", "pdf_reader"], model: "gemini-2.5-pro" },
        { name: "Editor", role: "Writes the cited briefing", tools: ["notion"], model: "claude-opus-5-5" },
      ],
      data: [{ entity: "Briefing", fields: ["title", "topic", "sources", "status", "confidence", "published_at"] }],
      integrations: ["Notion", "Slack"],
      secrets: ["SERP_API_KEY"],
    }),
  },
  {
    keys: /financ|invoice|expense|accounting|bill|payable|receipt/i,
    build: () => ({
      name: "Invoice Autopilot",
      domain: "finance",
      summary: () => "Capture invoices from email, match them to POs, and queue approvals with anomaly flags.",
      stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
      pages: [
        { name: "Invoices", description: "Captured invoices with match status" },
        { name: "Approvals", description: "What needs a human decision today" },
        { name: "Spend", description: "Spend by vendor and category" },
      ],
      agents: [
        { name: "Capturer", role: "Pulls invoices from the inbox and extracts line items", tools: ["gmail", "ocr"], model: "gemini-2.5-pro" },
        { name: "Matcher", role: "Three-way matches invoice, PO and receipt", tools: ["erp_read"], model: "claude-sonnet-5" },
        { name: "Auditor", role: "Flags duplicates and anomalies", tools: ["anomaly_model"], model: "gpt-5-mini" },
      ],
      data: [{ entity: "Invoice", fields: ["vendor", "amount", "due_date", "status", "match", "received_at"] }],
      integrations: ["Gmail", "QuickBooks"],
      secrets: ["QUICKBOOKS_TOKEN"],
    }),
  },
];

function titleFromPrompt(prompt: string) {
  const stop = new Set(["a", "an", "the", "app", "that", "which", "for", "to", "build", "me", "create", "make", "i", "want", "with", "and", "my", "of", "where", "an"]);
  const words = prompt
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w.toLowerCase()))
    .slice(0, 3)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return words.length ? words.join(" ") : "Untitled Agent App";
}

const genericDomain = (prompt: string): Domain => ({
  name: titleFromPrompt(prompt),
  domain: "generic",
  summary: (p) => `An agentic web app that ${p.trim().replace(/^(build|create|make)\s+(me\s+)?(an?\s+)?/i, "").slice(0, 140)}.`,
  stack: { frontend: "Next.js + Tailwind", backend: "FastAPI", database: "Postgres" },
  pages: [
    { name: "Dashboard", description: "Overview of activity and key numbers" },
    { name: "Workspace", description: "Where users run the agent on their input" },
    { name: "History", description: "Past runs with outputs and feedback" },
  ],
  agents: [
    { name: "Planner", role: "Breaks the user's request into steps", tools: ["reasoning"], model: "claude-sonnet-5" },
    { name: "Worker", role: "Executes each step with the right tools", tools: ["web_search", "http"], model: "gpt-5-mini" },
    { name: "Reviewer", role: "Checks the output before it reaches the user", tools: ["guardrails"], model: "claude-sonnet-5" },
  ],
  data: [{ entity: "Run", fields: ["title", "owner", "status", "score", "tokens", "created_at"] }],
  integrations: ["Slack"],
  secrets: [],
});

export function detectFramework(prompt: string): Framework {
  if (/langgraph|langchain/i.test(prompt)) return "langgraph";
  if (/crew\s?ai/i.test(prompt)) return "crewai";
  if (/openai agents|agents sdk/i.test(prompt)) return "openai-agents";
  if (/claude agent|anthropic/i.test(prompt)) return "claude-agent-sdk";
  return "lyzr-adk";
}

export function fallbackPlan(prompt: string, answers: Record<string, string> = {}, framework?: Framework): Plan {
  const match = DOMAINS.find((d) => d.keys.test(prompt));
  const d = match ? match.build() : genericDomain(prompt);
  const integrations = new Set(d.integrations);
  const secrets = new Set(d.secrets);
  if (answers.results === "Send to Slack") {
    integrations.add("Slack");
    secrets.add("SLACK_BOT_TOKEN");
  }
  if (answers.results === "Email a summary") integrations.add("Gmail");
  if (answers.source === "Google Sheets") integrations.add("Google Sheets");
  if (answers.source === "A database") integrations.add("Supabase");
  const pages = [...d.pages];
  if (answers.users === "My customers") pages.push({ name: "Customer portal", description: "Self-serve view for your customers" });
  return {
    name: d.name,
    summary: d.summary(prompt),
    domain: d.domain,
    framework: framework ?? detectFramework(prompt),
    stack: d.stack,
    pages,
    agents: d.agents,
    data: d.data,
    integrations: [...integrations],
    secrets: [...secrets],
    estimate: { minutes: 2 + pages.length, credits: 8 + d.agents.length * 3 + pages.length * 2 },
  };
}

export const CLARIFY_QUESTIONS: { id: string; q: string; options: string[] }[] = [
  { id: "users", q: "Who will use it?", options: ["Just me", "My team", "My customers"] },
  { id: "source", q: "Where does the data come from?", options: ["File uploads", "Google Sheets", "A database", "The web"] },
  { id: "results", q: "What should happen with the results?", options: ["Show in a dashboard", "Send to Slack", "Email a summary"] },
];

export function needsClarification(prompt: string) {
  return prompt.trim().split(/\s+/).length < 14;
}

export const EXAMPLE_PROMPTS = [
  "A KYC review desk where my team uploads customer documents and an agent flags missing fields",
  "Support triage that classifies Zendesk tickets, drafts replies and escalates angry VIPs to Slack",
  "A research analyst that tracks competitors weekly and writes me a cited briefing in Notion",
  "Invoice autopilot that reads invoices from Gmail and matches them to purchase orders",
];

export const TEMPLATES = [
  { id: "support", title: "Support Triage Desk", prompt: EXAMPLE_PROMPTS[1], framework: "langgraph" as Framework, uses: "2.4k" },
  { id: "kyc", title: "KYC Review Desk", prompt: EXAMPLE_PROMPTS[0], framework: "lyzr-adk" as Framework, uses: "1.1k" },
  { id: "research", title: "Research Analyst", prompt: EXAMPLE_PROMPTS[2], framework: "crewai" as Framework, uses: "3.0k" },
  { id: "sales", title: "Pipeline Copilot", prompt: "A sales copilot that enriches inbound leads, scores them and drafts outreach", framework: "openai-agents" as Framework, uses: "1.8k" },
  { id: "recruit", title: "Talent Screener", prompt: "A recruiting tool that parses resumes, ranks candidates and schedules interviews", framework: "claude-agent-sdk" as Framework, uses: "920" },
  { id: "finance", title: "Invoice Autopilot", prompt: EXAMPLE_PROMPTS[3], framework: "lyzr-adk" as Framework, uses: "760" },
];
