"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useRequireUser } from "@/lib/useRequireUser";
import { startProject, takePending } from "@/lib/start";

/** Hand-off after sign-in: turns the prompt the visitor typed on the landing page into a project. */
export default function NewProject() {
  const { user } = useRequireUser("/new");
  const router = useRouter();
  const once = useRef(false);

  useEffect(() => {
    if (!user || once.current) return;
    once.current = true;
    const pending = takePending();
    if (!pending) {
      router.replace("/home");
      return;
    }
    startProject(pending).then((id) => router.replace(`/p/${id}`));
  }, [user, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-bp" />
        <p className="mt-3 text-[14px] text-ink-2">Setting up your project…</p>
      </div>
    </div>
  );
}
