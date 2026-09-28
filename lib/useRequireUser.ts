"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth";

/** Redirects to /login when there's no session; returns the auth context. */
export function useRequireUser(next?: string) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
    }
  }, [auth.loading, auth.user, router, next]);
  return auth;
}
