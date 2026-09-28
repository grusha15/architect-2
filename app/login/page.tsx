"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Mail, Quote, Sparkles } from "lucide-react";
import { GitHubIcon, GoogleIcon, Wordmark } from "@/components/icons";
import { Button, inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { peekPending } from "@/lib/start";
import { getProfile } from "@/lib/store";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const { user, loading, mode, signInWithProvider, signInWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    setPendingPrompt(peekPending()?.prompt ?? null);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    getProfile(user.id).then((p) => router.replace(p ? next : `/onboarding?next=${encodeURIComponent(next)}`));
  }, [user, loading, next, router]);

  const provider = async (p: "google" | "github") => {
    setBusy(p);
    setError(null);
    await signInWithProvider(p, next);
  };

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setBusy("email");
    const r = await signInWithEmail(email, next);
    setBusy(null);
    if (r.error) setError(r.error);
    else if (r.sent) setSent(true);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left: context, keeps the user's intent visible */}
      <aside className="bp-grid relative hidden flex-col justify-between border-r border-line p-10 lg:flex">
        <Link href="/"><Wordmark /></Link>
        <div className="max-w-md">
          {pendingPrompt ? (
            <>
              <p className="label-mono text-bp">We saved your idea</p>
              <div className="mt-3 rounded-xl border border-line bg-surface p-4 shadow-sm">
                <p className="flex gap-2 text-[15px] leading-relaxed">
                  <Quote className="mt-1 size-4 shrink-0 text-bp" />
                  {pendingPrompt}
                </p>
              </div>
              <p className="mt-4 text-[14px] text-ink-2">Sign in and we&apos;ll draft a plan for it straight away. Nothing gets built until you approve it.</p>
            </>
          ) : (
            <>
              <p className="label-mono text-bp">Architect 2.0</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">One workspace for the people who imagine the app and the people who ship it.</h2>
            </>
          )}
        </div>
        <ul className="grid grid-cols-3 gap-3 text-[12.5px] text-ink-2">
          {["Plan before code", "Live preview", "Your GitHub, your code"].map((t) => (
            <li key={t} className="rounded-lg border border-line bg-surface/80 px-3 py-2">{t}</li>
          ))}
        </ul>
      </aside>

      {/* Right: sign in */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden"><Wordmark /></Link>
          <Link href="/" className="flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Back</Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[26px] font-semibold tracking-tight">Sign in to Architect</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">New here? The same buttons create your account.</p>

          {sent ? (
            <div className="mt-8 rounded-xl border border-ok/30 bg-ok-50 p-4 text-[14px]">
              <p className="font-medium text-ok">Check your inbox</p>
              <p className="mt-1 text-ink-2">We sent a sign-in link to <b>{email}</b>. It expires in 1 hour.</p>
            </div>
          ) : (
            <>
              <div className="mt-8 space-y-2.5">
                <Button size="lg" className="w-full" onClick={() => provider("google")} loading={busy === "google"}>
                  <GoogleIcon className="size-[18px]" /> Continue with Google
                </Button>
                <Button size="lg" variant="dark" className="w-full" onClick={() => provider("github")} loading={busy === "github"}>
                  <GitHubIcon className="size-[18px]" /> Continue with GitHub
                </Button>
                <p className="text-center text-[12px] text-ink-3">Developers: GitHub sign-in lets you import repos and open PRs right away.</p>
              </div>

              <div className="my-6 flex items-center gap-3 text-[12px] text-ink-3">
                <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
              </div>

              <form onSubmit={magic} className="space-y-2.5">
                <input className={inputCls + " h-11"} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
                <Button size="lg" variant="secondary" className="w-full" loading={busy === "email"} type="submit">
                  <Mail className="size-4" /> Email me a magic link
                </Button>
              </form>
              <p className="mt-3 text-center text-[12px] text-ink-3">Work at a company with SSO? <button className="underline hover:text-ink" onClick={() => setError("SSO (SAML/OIDC) is available on the Enterprise plan. Ask your admin for the workspace URL.")}>Use SSO</button></p>
            </>
          )}

          {error && <p className="mt-4 rounded-lg bg-bad-50 px-3 py-2 text-[13px] text-bad">{error}</p>}

          {mode === "demo" && (
            <p className="mt-8 flex gap-2 rounded-lg border border-warn/30 bg-warn-50 px-3 py-2.5 text-[12.5px] text-warn">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" />
              Demo mode: Supabase isn&apos;t configured, so sign-in creates a local demo account. Set NEXT_PUBLIC_SUPABASE_URL to enable real Google/GitHub OAuth.
            </p>
          )}
        </div>
        <p className="text-center text-[12px] text-ink-3">By continuing you agree to the Terms and acknowledge the Privacy Policy.</p>
      </main>
    </div>
  );
}
