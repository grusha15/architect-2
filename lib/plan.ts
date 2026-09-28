"use client";

import { useEffect, useState } from "react";

export type PlanId = "free" | "pro" | "team" | "enterprise";
export type Billing = "monthly" | "yearly";

export interface PricingPlan {
  id: PlanId;
  name: string;
  monthly: number | null;
  yearly: number | null;
  unit?: string;
  blurb: string;
  credits: number;
  features: string[];
}

export const PLANS: PricingPlan[] = [
  { id: "free", name: "Free", monthly: 0, yearly: 0, blurb: "Try it on a real idea", credits: 50, features: ["50 build credits / mo", "architect.app subdomain", "Public repos", "Community support"] },
  { id: "pro", name: "Pro", monthly: 25, yearly: 20, blurb: "For people shipping regularly", credits: 500, features: ["500 build credits / mo", "Bring your own model keys", "Private repos & custom domains", "Preview env per branch"] },
  { id: "team", name: "Team", monthly: 40, yearly: 32, unit: "/seat", blurb: "Builders and developers together", credits: 1500, features: ["1,500 shared credits / mo", "Roles & shared secrets", "SSO (Google, Okta)", "Spend controls & audit log"] },
  { id: "enterprise", name: "Enterprise", monthly: null, yearly: null, blurb: "Security and scale", credits: 0, features: ["VPC or on-prem sandboxes", "Lyzr Agent Runtime", "SLAs & dedicated support", "Custom model routing"] },
];

const key = (userId: string) => `architect.plan.${userId}`;
const EVT = "architect:plan";
const PENDING = "architect.pendingPlan";

export function getPlan(userId: string): PlanId {
  try {
    return (localStorage.getItem(key(userId)) as PlanId) || "free";
  } catch {
    return "free";
  }
}

export function setPlan(userId: string, plan: PlanId) {
  try {
    localStorage.setItem(key(userId), plan);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVT));
}

export function savePendingPlan(plan: PlanId) {
  try {
    sessionStorage.setItem(PENDING, plan);
  } catch {}
}

export function takePendingPlan(): PlanId | null {
  try {
    const p = sessionStorage.getItem(PENDING) as PlanId | null;
    sessionStorage.removeItem(PENDING);
    return p;
  } catch {
    return null;
  }
}

/** Current plan for a user, kept in sync across components. */
export function usePlan(userId: string | undefined) {
  const [plan, set] = useState<PlanId>("free");
  useEffect(() => {
    if (!userId) return;
    const sync = () => set(getPlan(userId));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);
  return plan;
}

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

export function priceLabel(p: PricingPlan, billing: Billing) {
  const v = billing === "yearly" ? p.yearly : p.monthly;
  if (v === null) return "Custom";
  if (v === 0) return "$0";
  return `$${v}`;
}
