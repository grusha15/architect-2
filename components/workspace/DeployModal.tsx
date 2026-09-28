"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Check, CircleCheck, Cloud, Container, Copy, ExternalLink, Loader2, PartyPopper, TriangleAlert } from "lucide-react";
import type { Plan, SecretEntry } from "@/lib/types";
import { Button, Field, Modal, inputCls } from "../ui";

type Stage = "config" | "preflight" | "deploying" | "done";

const TARGETS = [
  { id: "architect", label: "Architect Cloud", sub: "Scale-to-zero containers · global edge · managed Postgres", icon: Cloud, rec: true },
  { id: "vercel", label: "Vercel", sub: "Front end on Vercel, agents on Architect runtime", icon: Cloud },
  { id: "docker", label: "Docker image", sub: "Export an OCI image + compose file for your own cloud", icon: Container },
];

export function DeployModal({
  open,
  onClose,
  plan,
  secrets,
  defaultSlug,
  onOpenSecrets,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  secrets: SecretEntry[];
  defaultSlug: string;
  onOpenSecrets: () => void;
  onDeployed: (d: { env: "preview" | "production"; target: string; slug: string }) => string;
}) {
  const [stage, setStage] = useState<Stage>("config");
  const [target, setTarget] = useState("architect");
  const [env, setEnv] = useState<"preview" | "production">("production");
  const [slug, setSlug] = useState(defaultSlug);
  const [checks, setChecks] = useState<{ label: string; state: "wait" | "run" | "ok" | "warn" }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const missing = plan.secrets.filter((s) => !secrets.some((x) => x.key === s));

  useEffect(() => {
    if (open) {
      setStage("config");
      setSlug(defaultSlug);
      setChecks([]);
      setLogs([]);
    }
  }, [open, defaultSlug]);

  const preflight = async () => {
    setStage("preflight");
    const list = [
      { label: "Production build compiles", state: "wait" as const },
      { label: "Unit tests · 12 passed", state: "wait" as const },
      { label: "Agent evals ≥ 80%", state: "wait" as const },
      { label: "No secrets committed to code", state: "wait" as const },
      { label: missing.length ? `Secrets: ${missing.join(", ")} not set` : "All required secrets present", state: "wait" as const },
      { label: "Health check GET /api/health → 200", state: "wait" as const },
    ];
    setChecks(list);
    for (let i = 0; i < list.length; i++) {
      setChecks((c) => c.map((x, k) => (k === i ? { ...x, state: "run" } : x)));
      await new Promise((r) => setTimeout(r, 520));
      setChecks((c) => c.map((x, k) => (k === i ? { ...x, state: i === 4 && missing.length ? "warn" : "ok" } : x)));
    }
  };

  const deploy = async () => {
    setStage("deploying");
    const lines = [
      "Building image from commit a91c2e4 (nixpacks)…",
      "✓ web: Next.js standalone build · 38 routes · 2.1 MB",
      "✓ api: FastAPI · python 3.12 · uvicorn",
      `✓ agents: ${plan.framework} workflow packaged (${plan.agents.length} agents)`,
      "Pushing to registry.architect.app … done",
      `Provisioning ${env} database branch (Neon) … done`,
      "Injecting secrets from vault … done",
      "Creating revision rev-0007 (min 0 · max 20 instances)",
      "Health check passed — shifting traffic 0% → 100%",
    ];
    for (const l of lines) {
      await new Promise((r) => setTimeout(r, 480));
      setLogs((s) => [...s, l]);
    }
    const u = onDeployed({ env, target: TARGETS.find((t) => t.id === target)!.label, slug });
    setUrl(u);
    setStage("done");
  };

  const steps: Stage[] = ["config", "preflight", "deploying", "done"];

  return (
    <Modal open={open} onClose={onClose} title={stage === "done" ? "Your app is live" : "Deploy"} subtitle={stage === "done" ? undefined : plan.name} width="max-w-xl">
      <div className="mb-4 flex items-center gap-1.5">
        {["Configure", "Checks", "Deploy", "Live"].map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <span className={clsx("h-1 flex-1 rounded-full", steps.indexOf(stage) >= i ? "bg-bp" : "bg-sunken")} />
            <span className={clsx("text-[11px]", steps.indexOf(stage) >= i ? "font-medium text-ink" : "text-ink-3")}>{s}</span>
          </div>
        ))}
      </div>

      {stage === "config" && (
        <div className="space-y-4">
          <div className="space-y-2">
            {TARGETS.map((t) => (
              <button key={t.id} onClick={() => setTarget(t.id)} className={clsx("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left", target === t.id ? "border-bp bg-bp-50/60" : "border-line hover:border-line-strong")}>
                <t.icon className="size-4 text-ink-2" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] font-medium">{t.label} {t.rec && <span className="label-mono text-bp">Recommended</span>}</span>
                  <span className="block text-[12px] text-ink-3">{t.sub}</span>
                </span>
                {target === t.id && <Check className="size-4 text-bp" />}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Environment">
              <select className={inputCls} value={env} onChange={(e) => setEnv(e.target.value as "preview" | "production")}>
                <option value="production">Production</option>
                <option value="preview">Preview (share for feedback)</option>
              </select>
            </Field>
            <Field label="Address">
              <div className="flex items-center rounded-lg border border-line focus-within:border-bp">
                <input className="h-9 min-w-0 flex-1 rounded-l-lg bg-transparent pl-3 text-[13.5px] outline-none" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
                <span className="pr-3 text-[12px] text-ink-3">.architect.app</span>
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={preflight} disabled={!slug}>Run checks</Button>
          </div>
        </div>
      )}

      {stage === "preflight" && (
        <div className="space-y-4">
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[13px]">
                {c.state === "ok" ? <CircleCheck className="size-4 text-ok" /> : c.state === "warn" ? <TriangleAlert className="size-4 text-warn" /> : c.state === "run" ? <Loader2 className="size-4 animate-spin text-bp" /> : <span className="size-4 rounded-full border border-line-strong" />}
                <span className={clsx(c.state === "wait" && "text-ink-3")}>{c.label}</span>
              </li>
            ))}
          </ul>
          {checks.length > 0 && checks.every((c) => c.state === "ok" || c.state === "warn") && (
            <>
              {missing.length > 0 && (
                <div className="rounded-lg border border-warn/30 bg-warn-50 p-3 text-[12.5px]">
                  <p className="font-medium text-warn">Some connections won&apos;t work until you add their secrets</p>
                  <p className="mt-0.5 text-ink-2">The app will deploy, but features using {missing.join(", ")} will show a friendly &ldquo;not connected yet&rdquo; state.</p>
                  <button onClick={() => { onClose(); onOpenSecrets(); }} className="mt-1.5 font-medium text-bp hover:underline">Add secrets first</button>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setStage("config")}>Back</Button>
                <Button variant="primary" onClick={deploy}>{missing.length ? "Deploy anyway" : "Deploy now"}</Button>
              </div>
            </>
          )}
        </div>
      )}

      {stage === "deploying" && (
        <div className="scroll-night max-h-72 overflow-y-auto rounded-lg bg-night p-3 font-mono text-[11.5px] leading-5 text-white/75">
          {logs.map((l) => <p key={l} className={clsx("anim-rise", l.startsWith("✓") && "text-emerald-300")}>{l}</p>)}
          <p className="caret text-white/40" />
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ok-50"><PartyPopper className="size-6 text-ok" /></span>
          <div>
            <p className="text-[13px] text-ink-2">{plan.name} is live on {env}. Share it with your team.</p>
            <div className="mx-auto mt-3 flex max-w-sm items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-left font-mono text-[12.5px]">{slug}.architect.app</span>
              <button aria-label="Copy URL" onClick={() => { navigator.clipboard?.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded p-1 hover:bg-sunken">
                {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" onClick={onClose}>Back to editor</Button>
            <a href={url} target="_blank" rel="noreferrer"><Button variant="primary">Open app <ExternalLink className="size-3.5" /></Button></a>
          </div>
          <p className="text-[11.5px] text-ink-3">Scales to zero when idle. Roll back any time from the Deploy panel.</p>
        </div>
      )}
    </Modal>
  );
}
