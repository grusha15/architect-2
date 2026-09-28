"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser } from "./types";
import { getSupabase, supabaseConfigured } from "./supabase";

const DEMO_KEY = "architect.demoUser";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  mode: "supabase" | "demo";
  /** GitHub OAuth token (only present after signing in with GitHub on Supabase). */
  githubToken: string | null;
  signInWithProvider: (provider: "google" | "github", next?: string) => Promise<void>;
  signInWithEmail: (email: string, next?: string) => Promise<{ sent: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readDemoUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const mode: "supabase" | "demo" = supabaseConfigured ? "supabase" : "demo";

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUser(readDemoUser());
      setLoading(false);
      return;
    }
    const apply = (session: Awaited<ReturnType<typeof sb.auth.getSession>>["data"]["session"]) => {
      if (!session) {
        setUser(null);
        setGithubToken(null);
        return;
      }
      const u = session.user;
      const meta = u.user_metadata ?? {};
      setUser({
        id: u.id,
        email: u.email ?? "",
        name: meta.full_name ?? meta.name ?? meta.user_name ?? (u.email ?? "Builder").split("@")[0],
        avatar: meta.avatar_url,
        provider: u.app_metadata?.provider ?? "email",
      });
      if (session.provider_token && u.app_metadata?.provider === "github") {
        setGithubToken(session.provider_token);
        try {
          sessionStorage.setItem("architect.ghToken", session.provider_token);
        } catch {}
      } else {
        try {
          setGithubToken(sessionStorage.getItem("architect.ghToken"));
        } catch {}
      }
    };
    sb.auth.getSession().then(({ data }) => {
      apply(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithProvider = useCallback(async (provider: "google" | "github", next = "/home") => {
    const sb = getSupabase();
    if (!sb) {
      const demo: AppUser = {
        id: "demo-user",
        email: provider === "github" ? "octo@demo.dev" : "you@demo.dev",
        name: provider === "github" ? "Octo Dev" : "Demo Builder",
        provider,
      };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
      setUser(demo);
      return;
    }
    await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: provider === "github" ? "read:user repo" : undefined,
      },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, next = "/home") => {
    const sb = getSupabase();
    if (!sb) {
      const demo: AppUser = { id: "demo-user", email, name: email.split("@")[0], provider: "email" };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
      setUser(demo);
      return { sent: false };
    }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    return error ? { sent: false, error: error.message } : { sent: true };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    try {
      localStorage.removeItem(DEMO_KEY);
      sessionStorage.removeItem("architect.ghToken");
    } catch {}
    setUser(null);
    setGithubToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, mode, githubToken, signInWithProvider, signInWithEmail, signOut }),
    [user, loading, mode, githubToken, signInWithProvider, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
