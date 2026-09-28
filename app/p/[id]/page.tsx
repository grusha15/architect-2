"use client";

import Link from "next/link";
import { use, useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Workspace } from "@/components/workspace/Workspace";
import { useRequireUser } from "@/lib/useRequireUser";
import { getProject } from "@/lib/store";
import type { Project } from "@/lib/types";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useRequireUser(`/p/${id}`);
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    getProject(id)
      .then(setProject)
      .catch(() => setProject(null));
  }, [id, user]);

  if (project === undefined)
    return (
      <div className="grid h-dvh place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-bp" />
          <p className="mt-2 text-[13px] text-ink-2">Waking up your sandbox…</p>
        </div>
      </div>
    );

  if (project === null)
    return (
      <div className="grid h-dvh place-items-center">
        <div className="text-center">
          <p className="font-semibold">Project not found</p>
          <p className="mt-1 text-[13px] text-ink-2">It may have been deleted, or you don&apos;t have access.</p>
          <Link href="/home" className="mt-3 inline-block text-[13px] font-medium text-bp hover:underline">Back to dashboard</Link>
        </div>
      </div>
    );

  return (
    <Suspense>
      <Workspace initial={project} />
    </Suspense>
  );
}
