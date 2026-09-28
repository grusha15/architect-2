import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Wordmark } from "@/components/icons";

export const metadata = { title: "Architecture · Architect 2.0" };

const V1 = [
  { part: "Sandboxes", choice: "E2B (managed Firecracker microVMs), one per active project", mode: "Buy", why: "AI-written code is untrusted and agent frameworks need real Linux and Python. Managed sandboxes give that in days, not months." },
  { part: "Agent loop", choice: "A job queue inside our API service. Each run: plan, act, verify, commit. Run state saved in Postgres", mode: "Build", why: "This is the product. Keeping it in one service makes it easy to change quickly." },
  { part: "Models", choice: "A gateway module in the API (AI SDK or LiteLLM) with one message and tool format", mode: "Build (thin)", why: "Switching Claude, GPT, Gemini or open-source becomes a setting, not a rewrite." },
  { part: "Live preview", choice: "Sandbox port URLs behind a small Cloudflare Worker proxy", mode: "Build (small)", why: "Checks the viewer has access, wakes paused sandboxes, keeps previews on their own domain." },
  { part: "Realtime", choice: "WebSocket from the API; Redis pub/sub between workers", mode: "Build", why: "Streams the build timeline, logs and terminal to the browser." },
  { part: "GitHub", choice: "GitHub App with short-lived tokens and webhooks. Every agent turn is a commit on a branch", mode: "Build", why: "Git is the source of truth: undo, export, pull requests, no lock-in." },
  { part: "User app hosting", choice: "Front ends on Vercel or Cloudflare; backends and agents on Fly Machines or Cloud Run; Neon for each app's database", mode: "Buy", why: "These already scale to zero and roll back. No reason to build hosting on day one." },
  { part: "Architect itself", choice: "Web app on Vercel, API and workers as containers on Cloud Run, Supabase Postgres, Redis, S3", mode: "Buy", why: "Small team, few moving parts, easy to operate." },
];

const LATER = [
  { when: "Agent runs last hours and wait on people (approvals, questions)", then: "Move runs from the job queue to Temporal for durable, resumable workflows" },
  { when: "The sandbox bill becomes a top-3 cost, or enterprise needs VPC", then: "Self-host Firecracker on bare metal behind the same sandbox interface" },
  { when: "Teams need spend caps, bring-your-own-key and per-app metering", then: "Split the model gateway into its own service" },
  { when: "Thousands of deployed apps and hosting margin matters", then: "Run user apps on our own scale-to-zero cluster (Knative)" },
  { when: "Agent traces and usage outgrow Postgres", then: "Send them to ClickHouse" },
  { when: "One region is saturated or customers need data residency", then: "Split into regional cells with their own sandboxes and workers" },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
          <Link href="/"><Wordmark /></Link>
          <Link href="/" className="ml-auto flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"><ArrowLeft className="size-3.5" /> Back to product</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <p className="label-mono text-bp">Technical architecture</p>
        <h1 className="mt-2 max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight">Start simple, then scale the parts that need it</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Most tools in this space pair a managed sandbox with one agent service and deploy to hosts that already exist. Architect 2.0 starts the same way. Heavier pieces come later, each tied to a clear trigger. The full reasoning is in <code className="rounded bg-sunken px-1 font-mono text-[13px]">docs/ARCHITECTURE.md</code>.
        </p>

        <section className="mt-10">
          <h2 className="text-[20px] font-semibold tracking-tight">1. What we would ship first</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-sm">
            <a href="/architecture-v1.svg" target="_blank" rel="noreferrer" title="Open full size">
              <img src="/architecture-v1.svg" alt="v1 architecture: browser, web app, one API and agent worker service, E2B sandboxes, LLM providers, GitHub, and existing hosts for deployed apps" className="min-w-[860px]" />
            </a>
          </div>
          <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead className="border-b border-line bg-paper text-[12px] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Part</th>
                  <th className="px-4 py-2.5 font-medium">v1 choice</th>
                  <th className="px-4 py-2.5 font-medium">Buy or build</th>
                  <th className="px-4 py-2.5 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {V1.map((r) => (
                  <tr key={r.part}>
                    <td className="px-4 py-3 font-medium">{r.part}</td>
                    <td className="px-4 py-3">{r.choice}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${r.mode.startsWith("Buy") ? "bg-sunken text-ink-2" : "bg-bp-50 text-bp"}`}>{r.mode}</span></td>
                    <td className="px-4 py-3 text-ink-2">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[20px] font-semibold tracking-tight">2. What changes as it grows</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">None of these are needed on day one. Each one is added when its trigger shows up in the numbers.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {LATER.map((l) => (
              <div key={l.then} className="rounded-xl border border-line bg-surface p-4">
                <p className="label-mono text-ink-3">When</p>
                <p className="mt-1 text-[13.5px]">{l.when}</p>
                <p className="label-mono mt-3 text-bp">Then</p>
                <p className="mt-1 text-[13.5px] font-medium">{l.then}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[20px] font-semibold tracking-tight">3. Target architecture at scale</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">Where the design ends up once all of the above has happened: thousands of builders at once, many regions, enterprise requirements.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-sm">
            <a href="/architecture-diagram.svg" target="_blank" rel="noreferrer" title="Open full size">
              <img src="/architecture-diagram.svg" alt="Target architecture at scale: edge, control plane, data tier, sandbox fleet, external providers and user app runtime" className="min-w-[900px]" />
            </a>
          </div>
          <a href="/architecture-diagram.svg" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-bp hover:underline">Open full size <ExternalLink className="size-3" /></a>
        </section>

        <section className="mt-14">
          <h2 className="text-[20px] font-semibold tracking-tight">4. This prototype vs. the real system</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead className="border-b border-line bg-paper text-[12px] text-ink-3">
                <tr><th className="px-4 py-2.5 font-medium">Area</th><th className="px-4 py-2.5 font-medium">In this prototype</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Authentication", "Real: Supabase Auth with email magic link and GitHub / Google OAuth"],
                  ["Database", "Real: Supabase Postgres with row-level security (projects, profiles, published apps)"],
                  ["Plan generation", "Real LLM call through a small model gateway (Anthropic, OpenAI, Gemini), with an offline fallback"],
                  ["Attachments", "Real: files and images are read in the browser; text files are passed to the planner as context"],
                  ["GitHub", "Real repo listing and create-repo-and-push when signed in with GitHub; pull requests simulated"],
                  ["Sandbox, build, preview", "Simulated with realistic events, timeline and progressive rendering"],
                  ["Code view", "Real Monaco editor over generated framework code; simulated terminal"],
                  ["Deploy", "Full flow; the deployed app is served at /apps/<slug> from the stored plan"],
                ].map(([a, b]) => (
                  <tr key={a}><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-ink-2">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
