"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Badge, Button, Field, Segmented, inputCls } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/lib/auth";
import { MODELS } from "@/lib/planner";
import { planById, usePlan } from "@/lib/plan";
import { Pricing } from "@/components/Pricing";
import { getProfile, saveProfile } from "@/lib/store";
import type { Role, ViewMode } from "@/lib/types";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "models", label: "Models & keys" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing & usage" },
  { id: "tokens", label: "API tokens" },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense>
        <Settings />
      </Suspense>
    </AppShell>
  );
}

function Settings() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "profile";
  return (
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">Settings</h1>
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => router.replace(`/settings?tab=${t.id}`)} className={clsx("-mb-px shrink-0 border-b-2 px-3 py-2 text-[13.5px] font-medium", tab === t.id ? "border-bp text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "profile" && <ProfileTab />}
        {tab === "models" && <ModelsTab />}
        {tab === "team" && <TeamTab />}
        {tab === "billing" && <BillingTab />}
        {tab === "tokens" && <TokensTab />}
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileTab() {
  const { user, mode } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<Role>("both");
  const [view, setView] = useState<ViewMode>("preview");
  useEffect(() => {
    if (user) getProfile(user.id).then((p) => { if (p) { setRole(p.role); setView(p.default_view); } });
  }, [user]);
  if (!user) return null;
  return (
    <div className="space-y-4">
      <Card title="Account">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatar} size={44} />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-[13px] text-ink-3">{user.email} · signed in with {user.provider}</p>
          </div>
          <Badge tone={mode === "supabase" ? "ok" : "warn"} className="ml-auto">{mode === "supabase" ? "Supabase auth" : "Demo mode"}</Badge>
        </div>
      </Card>
      <Card title="How you build" sub="Sets your defaults. Every feature stays available.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
            <span>I am a…</span>
            <Segmented value={role} onChange={setRole} options={[{ value: "builder", label: "Builder" }, { value: "developer", label: "Developer" }, { value: "both", label: "Both" }]} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
            <span>Open projects in</span>
            <Segmented value={view} onChange={setView} options={[{ value: "preview", label: "Preview" }, { value: "code", label: "Code" }, { value: "agents", label: "Agents" }]} />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={async () => { await saveProfile(user.id, { role, default_view: view, full_name: user.name }); toast("Preferences saved"); }}>Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ModelsTab() {
  const toast = useToast();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [def, setDef] = useState("auto");
  const [keys, setKeys] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((d) => setProviders(d.providers)).catch(() => setProviders([]));
  }, []);
  const provs = [
    { id: "anthropic", label: "Anthropic", env: "ANTHROPIC_API_KEY" },
    { id: "openai", label: "OpenAI", env: "OPENAI_API_KEY" },
    { id: "google", label: "Google Gemini", env: "GEMINI_API_KEY" },
    { id: "open-source", label: "Self-hosted (vLLM / Ollama)", env: "OPENAI_COMPATIBLE_BASE_URL" },
  ];
  return (
    <div className="space-y-4">
      <Card title="Default model" sub="Used by the Architect agent. Override per project or per agent.">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setDef(m.id)} className={clsx("rounded-lg border px-3 py-2.5 text-left", def === m.id ? "border-bp bg-bp-50/60" : "border-line hover:border-line-strong")}>
              <span className="flex items-center justify-between text-[13.5px] font-medium">{m.label} {def === m.id && <Check className="size-4 text-bp" />}</span>
              <span className="block text-[12px] text-ink-3">{m.provider} · {m.note}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Provider keys (BYOK)" sub="Optional. Without keys, usage is billed as Architect credits. With keys, you pay the provider directly.">
        <ul className="space-y-3">
          {provs.map((p) => {
            const live = providers?.includes(p.id);
            return (
              <li key={p.id} className="grid items-center gap-2 sm:grid-cols-[200px_1fr_auto]">
                <span className="text-[13.5px] font-medium">{p.label}{live && <Badge tone="ok" className="ml-2">server key active</Badge>}</span>
                <input type="password" className={inputCls + " font-mono text-[12.5px]"} placeholder={p.env} value={keys[p.id] ?? ""} onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })} />
                <Button disabled={!keys[p.id]} onClick={() => { toast(`${p.label} key verified and saved`); setKeys({ ...keys, [p.id]: "" }); }}>Save</Button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] text-ink-3">All providers sit behind one model gateway with a shared tool-calling format, so switching models never changes your app code.</p>
      </Card>
    </div>
  );
}

function TeamTab() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  return (
    <Card title="Members" sub="Roles: Viewer · Builder · Developer · Admin">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) { setInvites([...invites, email]); setEmail(""); } }}>
        <input className={inputCls} placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="primary" type="submit"><Plus className="size-4" /> Invite</Button>
      </form>
      <ul className="mt-4 divide-y divide-line">
        <li className="flex items-center gap-3 py-2.5 text-[13.5px]"><Avatar name={user?.name ?? "You"} size={28} /><span className="flex-1">{user?.email}</span><Badge>Admin</Badge></li>
        {invites.map((i) => <li key={i} className="flex items-center gap-3 py-2.5 text-[13.5px]"><Avatar name={i} size={28} /><span className="flex-1">{i}</span><Badge tone="warn">Pending</Badge></li>)}
      </ul>
      <p className="mt-3 text-[12px] text-ink-3">SSO (SAML/OIDC) and SCIM provisioning are available on Enterprise.</p>
    </Card>
  );
}

function BillingTab() {
  const { user } = useAuth();
  const plan = planById(usePlan(user?.id));
  const credits = plan.credits || 10000;
  const rows = [
    { l: "Build credits", used: 12, total: credits, unit: "credits" },
    { l: "Sandbox hours", used: 6.2, total: plan.id === "free" ? 20 : 200, unit: "h" },
    { l: "Agent runs (deployed apps)", used: 412, total: plan.id === "free" ? 1000 : 25000, unit: "runs" },
    { l: "Bandwidth", used: 1.4, total: plan.id === "free" ? 10 : 100, unit: "GB" },
  ];
  return (
    <div className="space-y-4">
      <Card title={`${plan.name} plan · usage`} sub="Resets on the 1st of each month.">
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.l}>
              <div className="flex justify-between text-[13px]"><span>{r.l}</span><span className="font-mono text-ink-3">{r.used} / {r.total.toLocaleString()} {r.unit}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-sunken"><div className="h-full rounded-full bg-bp" style={{ width: `${Math.max(1, (r.used / r.total) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Change plan" sub="Demo billing: switching plans updates your limits instantly, no card required.">
        <Pricing compact />
      </Card>
      <Card title="Spend controls" sub="Protect against runaway agents in deployed apps.">
        <div className="flex flex-wrap items-center gap-2 text-[13.5px]">Alert me at <input className={inputCls + " w-20"} defaultValue="80" /> % of monthly limit, hard-stop at <input className={inputCls + " w-20"} defaultValue="100" /> %</div>
      </Card>
    </div>
  );
}

function TokensTab() {
  const [tokens, setTokens] = useState<{ name: string; value: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <Card title="API tokens" sub="Drive Architect from CI, the CLI, or your own tools (architect deploy, architect run).">
      <Button onClick={() => setTokens([...tokens, { name: `token-${tokens.length + 1}`, value: `arch_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}` }])}><KeyRound className="size-4" /> Generate token</Button>
      <ul className="mt-4 space-y-2">
        {tokens.map((t) => (
          <li key={t.value} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <span className="text-[13px] font-medium">{t.name}</span>
            <code className="flex-1 truncate font-mono text-[12px] text-ink-3">{t.value}</code>
            <button aria-label="Copy token" onClick={() => { navigator.clipboard?.writeText(t.value).catch(() => {}); setCopied(t.value); }} className="rounded p-1 hover:bg-sunken">{copied === t.value ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}</button>
          </li>
        ))}
      </ul>
      {tokens.length > 0 && <p className="mt-2 text-[12px] text-warn">Copy it now. Tokens are only shown once.</p>}
    </Card>
  );
}
