"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/icons";
import { GeneratedApp, ALL_REVEALED } from "@/components/workspace/GeneratedApp";
import { defaultPreview, fallbackPlan } from "@/lib/planner";
import { getPublishedBySlug } from "@/lib/store";
import type { Plan, PreviewState } from "@/lib/types";

/** A deployed user app, as its end users see it. */
export default function DeployedApp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [state, setState] = useState<{ plan: Plan; preview: PreviewState } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getPublishedBySlug(slug)
      .then((p) => {
        if (p?.data.plan) setState({ plan: p.data.plan, preview: p.data.preview });
        else setState({ plan: fallbackPlan(slug.replace(/-/g, " ")), preview: defaultPreview() });
      })
      .catch(() => setState({ plan: fallbackPlan(slug.replace(/-/g, " ")), preview: defaultPreview() }));
  }, [slug]);

  useEffect(() => {
    if (state) document.title = state.plan.name;
  }, [state]);

  if (!state)
    return (
      <div className="grid h-dvh place-items-center">
        <Loader2 className="size-5 animate-spin text-ink-3" />
      </div>
    );

  return (
    <div className="relative h-dvh">
      <div className="h-full overflow-auto">
        <GeneratedApp plan={state.plan} preview={state.preview} revealed={ALL_REVEALED} page={page} setPage={setPage} />
      </div>
      <a href="/" className="fixed bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-line bg-surface/95 px-2.5 py-1.5 text-[11.5px] font-medium text-ink-2 shadow-lg backdrop-blur hover:text-ink">
        <Logo size={16} /> Built with Architect
      </a>
    </div>
  );
}
