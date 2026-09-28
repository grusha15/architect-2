import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Wordmark } from "@/components/icons";

export const metadata = { title: "Architecture · Architect 2.0" };

const DECISIONS = [
  { k: "Sandboxes", v: "Firecracker microVM per active project (E2B first, self-hosted later). Warm pools per template, snapshot-on-idle, resume < 2s.", why: "AI-written code is untrusted; agent frameworks need real Linux + Python." },
  { k: "Agent harness", v: "Plan → Act → Verify → Checkpoint loop on Temporal. Typed tools, repo map + RAG, self-heal budget of 3 per error signature.", why: "Long, human-in-the-loop runs must survive crashes and be replayable." },
  { k: "Model-agnostic", v: "Model Gateway with one canonical messages+tools schema, provider adapters, capability registry, per-model prompt packs, fallback, BYOK.", why: "Switching Claude ↔ GPT ↔ Gemini ↔ open-source is a routing key, not a refactor." },
  { k: "Frontend ↔ sandbox", v: "REST for CRUD, one WebSocket per session (Redis streams with replay offsets), live preview iframe on a separate origin.", why: "Real-time timeline/terminal; reconnects never lose events." },
  { k: "Proxies", v: "Preview Proxy (routing, signed tokens, wake-on-request, HMR), Egress Proxy (allow-list, secret injection), Model Gateway (LLM).", why: "Three choke points for security, secrets and metering." },
  { k: "GitHub", v: "GitHub App with short-lived installation tokens + webhooks. Every agent turn is a commit; branches + PRs, never force-push.", why: "Git is the source of truth — undo, export, no lock-in." },
  { k: "User app deploys", v: "Commit SHA → isolated build → signed image → Knative revision (scale-to-zero) + Neon DB branch + vault secrets.", why: "Thousands of idle apps cost ~0; rollback is a traffic shift." },
  { k: "Architect itself", v: "Multi-AZ EKS control plane, bare-metal sandbox pools in an isolated VPC, Terraform + ArgoCD, Cloudflare edge.", why: "Portable, auditable, blast-radius isolated." },
  { k: "Scale", v: "Cell-based regions, KEDA autoscaling on queue depth, CPU overcommit + hibernation, LLM rate-limit pools + prompt caching.", why: "Binding constraints are VM memory and LLM throughput." },
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
        <h1 className="mt-2 max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight">How Architect 2.0 would work in the real world</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Every service, how they connect, and the path from a typed prompt to a live app. The full reasoning — options considered, trade-offs, capacity math — is in <code className="rounded bg-sunken px-1 font-mono text-[13px]">docs/ARCHITECTURE.md</code>.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-sm">
          <a href="/architecture-diagram.svg" target="_blank" rel="noreferrer" title="Open full size">
            <img src="/architecture-diagram.svg" alt="Architect 2.0 system architecture diagram showing clients, edge, control plane, data tier, sandbox fleet, external providers and user app runtime" className="min-w-[900px]" />
          </a>
        </div>
        <a href="/architecture-diagram.svg" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-bp hover:underline">Open diagram full size <ExternalLink className="size-3" /></a>

        <h2 className="mt-14 text-[20px] font-semibold tracking-tight">Key decisions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DECISIONS.map((d) => (
            <div key={d.k} className="rounded-xl border border-line bg-surface p-4">
              <p className="label-mono text-bp">{d.k}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed">{d.v}</p>
              <p className="mt-2 text-[12.5px] text-ink-3">Why: {d.why}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-[20px] font-semibold tracking-tight">This prototype vs. the real system</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="border-b border-line bg-paper text-[12px] text-ink-3">
              <tr><th className="px-4 py-2.5 font-medium">Area</th><th className="px-4 py-2.5 font-medium">In this prototype</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Authentication", "Real — Supabase Auth with Google, GitHub and email magic link"],
                ["Database", "Real — Supabase Postgres with row-level security (projects, profiles, published apps)"],
                ["Plan generation", "Real LLM call through a mini model gateway (Anthropic / OpenAI / Gemini), deterministic fallback"],
                ["GitHub", "Real repo listing + real create-repo-and-push when signed in with GitHub; PRs simulated"],
                ["Sandbox, build, preview", "Simulated with realistic events, timeline and progressive rendering"],
                ["Code lens", "Real Monaco editor over generated framework code; simulated terminal"],
                ["Deploy", "Full flow; deployed app served at /apps/<slug> from the stored plan"],
              ].map(([a, b]) => (
                <tr key={a}><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-ink-2">{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
