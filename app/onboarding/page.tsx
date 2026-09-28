"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, Check, Code2, Layers, MonitorPlay } from "lucide-react";
import { Wordmark } from "@/components/icons";
import { Button } from "@/components/ui";
import { useRequireUser } from "@/lib/useRequireUser";
import { saveProfile } from "@/lib/store";
import type { Role, ViewMode } from "@/lib/types";

const ROLES: { id: Role; title: string; body: string; icon: typeof Code2; view: ViewMode; perks: string[] }[] = [
  { id: "builder", title: "I describe, Architect builds", body: "I don't write code — I want a working tool.", icon: MonitorPlay, view: "preview", perks: ["Opens in Preview lens", "Plain-English progress", "Guided connections"] },
  { id: "developer", title: "I write code, AI helps", body: "I want control: diffs, terminal, my repo.", icon: Code2, view: "code", perks: ["Opens in Code lens", "Tool calls visible", "GitHub-first flows"] },
  { id: "both", title: "A bit of both", body: "I prototype, then go deeper when needed.", icon: Layers, view: "preview", perks: ["Preview lens, Code one click away", "Technical details on demand"] },
];

const GOALS = ["An AI agent or workflow", "An internal tool", "A customer-facing app", "Continue an existing project"];

export default function OnboardingPage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const { user } = useRequireUser();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/home";
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user || !role) return;
    setSaving(true);
    const view = ROLES.find((r) => r.id === role)!.view;
    await saveProfile(user.id, { role, default_view: view, full_name: user.name }).catch(() => {});
    router.replace(goal === GOALS[3] && next === "/home" ? "/import" : next);
  };

  return (
    <div className="bp-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="flex items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 2`}>
            {[0, 1].map((i) => (
              <span key={i} className={clsx("h-1.5 rounded-full transition-all", i <= step ? "w-8 bg-bp" : "w-4 bg-line-strong")} />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <section className="anim-rise mt-16">
            <p className="label-mono text-bp">Welcome{user ? `, ${user.name.split(" ")[0]}` : ""}</p>
            <h1 className="mt-2 text-[30px] font-semibold tracking-tight">How do you like to build?</h1>
            <p className="mt-2 text-[15px] text-ink-2">This only sets your starting view. Everything is available to everyone, and you can switch any time.</p>
            <div className="mt-8 grid gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={clsx(
                    "flex items-start gap-4 rounded-xl border bg-surface p-4 text-left transition",
                    role === r.id ? "border-bp ring-4 ring-bp-50" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className={clsx("grid size-10 shrink-0 place-items-center rounded-lg", role === r.id ? "bg-bp text-white" : "bg-sunken text-ink-2")}>
                    <r.icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{r.title}</span>
                    <span className="block text-[13.5px] text-ink-2">{r.body}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {r.perks.map((p) => (
                        <span key={p} className="rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] text-ink-2">{p}</span>
                      ))}
                    </span>
                  </span>
                  {role === r.id && <Check className="size-5 text-bp" />}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button variant="primary" size="lg" disabled={!role} onClick={() => setStep(1)}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>
        ) : (
          <section className="anim-rise mt-16">
            <p className="label-mono text-bp">Last thing</p>
            <h1 className="mt-2 text-[30px] font-semibold tracking-tight">What are you building first?</h1>
            <p className="mt-2 text-[15px] text-ink-2">We&apos;ll suggest templates that fit. Skip if you already know.</p>
            <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={clsx("rounded-xl border bg-surface px-4 py-3.5 text-left text-[14px] font-medium transition", goal === g ? "border-bp ring-4 ring-bp-50" : "border-line hover:border-line-strong")}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={finish}>Skip</Button>
                <Button variant="primary" size="lg" onClick={finish} loading={saving}>
                  Enter Architect <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
