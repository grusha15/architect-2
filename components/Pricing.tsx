"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PLANS, priceLabel, savePendingPlan, setPlan, usePlan, type Billing, type PlanId } from "@/lib/plan";
import { Button, Field, Modal, inputCls } from "./ui";
import { useToast } from "./toast";

/** Plan picker used on the landing page and in Settings → Billing. No real checkout. */
export function Pricing({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const current = usePlan(user?.id);
  const [billing, setBilling] = useState<Billing>("yearly");
  const [focus, setFocus] = useState<PlanId>("pro");
  const [confirm, setConfirm] = useState<PlanId | null>(null);
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesSent, setSalesSent] = useState(false);

  const choose = (id: PlanId) => {
    setFocus(id);
    if (id === "enterprise") {
      setSalesSent(false);
      setSalesOpen(true);
      return;
    }
    if (!user) {
      savePendingPlan(id);
      router.push("/login?next=/home");
      return;
    }
    if (id === current) return;
    setConfirm(id);
  };

  const apply = () => {
    if (!user || !confirm) return;
    setPlan(user.id, confirm);
    toast(confirm === "free" ? "Switched to Free" : `You're on ${PLANS.find((p) => p.id === confirm)!.name} (${billing})`);
    setConfirm(null);
  };

  const target = PLANS.find((p) => p.id === confirm);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-sunken p-0.5" role="radiogroup" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={clsx("h-7 rounded-md px-3 text-[13px] font-medium capitalize", billing === b ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-ok">Save 20% with yearly billing</span>
      </div>

      <div className={clsx("mt-6 grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
        {PLANS.map((p) => {
          const isCurrent = Boolean(user) && current === p.id;
          const isFocus = focus === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setFocus(p.id)}
              className={clsx(
                "flex cursor-pointer flex-col rounded-xl border bg-surface p-5 text-left transition",
                isFocus ? "border-bp ring-4 ring-bp-50" : "border-line hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {isCurrent ? <span className="rounded-md bg-ok-50 px-1.5 py-0.5 text-[11px] font-medium text-ok">Current plan</span> : p.id === "pro" ? <span className="label-mono text-bp">Popular</span> : null}
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{p.blurb}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-[26px] font-semibold tracking-tight">{priceLabel(p, billing)}</span>
                {p.monthly ? <span className="text-[12.5px] text-ink-3">{p.unit ?? ""}/mo{billing === "yearly" ? ", billed yearly" : ""}</span> : null}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-bp" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={isCurrent ? "secondary" : isFocus ? "primary" : "secondary"}
                disabled={isCurrent}
                onClick={(e) => {
                  e.stopPropagation();
                  choose(p.id);
                }}
              >
                {isCurrent ? "Your plan" : p.id === "enterprise" ? "Talk to sales" : !user ? (p.id === "free" ? "Start free" : `Start with ${p.name}`) : current === "free" || PLANS.findIndex((x) => x.id === p.id) > PLANS.findIndex((x) => x.id === current) ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={target ? `Switch to ${target.name}?` : ""} subtitle="Demo checkout: no card is charged.">
        {target && (
          <div className="space-y-4 text-[13.5px]">
            <div className="rounded-lg border border-line p-3">
              <div className="flex justify-between">
                <span>{target.name} · {billing}</span>
                <span className="font-semibold">{priceLabel(target, billing)}{target.monthly ? `${target.unit ?? ""}/mo` : ""}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-3">{target.credits.toLocaleString()} build credits per month. Change or cancel any time.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="primary" onClick={apply}>Confirm {target.name}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={salesOpen} onClose={() => setSalesOpen(false)} title="Talk to sales" subtitle="Tell us a little about your team.">
        {salesSent ? (
          <p className="text-[13.5px] text-ink-2">Thanks. Someone from the team will reply within one business day.</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSalesSent(true);
            }}
          >
            <Field label="Work email"><input required type="email" defaultValue={user?.email ?? ""} className={inputCls} /></Field>
            <Field label="Team size">
              <select className={inputCls}><option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option></select>
            </Field>
            <Field label="What do you want to build?"><textarea rows={3} className="w-full resize-none rounded-lg border border-line p-2.5 text-[13.5px] outline-none focus:border-bp" /></Field>
            <div className="flex justify-end"><Button variant="primary" type="submit">Send</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
