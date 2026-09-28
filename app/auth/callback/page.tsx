"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getProfile } from "@/lib/store";

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

function Callback() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    getProfile(user.id)
      .then((p) => router.replace(p ? next : `/onboarding?next=${encodeURIComponent(next)}`))
      .catch(() => router.replace(`/onboarding?next=${encodeURIComponent(next)}`));
  }, [user, loading, next, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-bp" />
        <p className="mt-3 text-[14px] text-ink-2">Signing you in…</p>
        {slow && !user && (
          <p className="mt-2 text-[13px] text-ink-3">
            Taking longer than usual. <a className="underline" href="/login">Try again</a>
          </p>
        )}
      </div>
    </div>
  );
}
