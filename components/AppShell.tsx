"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronsUpDown, House, LayoutTemplate, LogOut, Menu, Rocket, Settings, X } from "lucide-react";
import { GitHubIcon, Wordmark } from "./icons";
import { Avatar } from "./ui";
import { useRequireUser } from "@/lib/useRequireUser";

const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/home#templates", label: "Templates", icon: LayoutTemplate },
  { href: "/import", label: "Import repo", icon: GitHubIcon },
  { href: "/home#deployments", label: "Deployments", icon: Rocket },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/architecture", label: "Architecture", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, mode, signOut } = useRequireUser();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (loading || !user) return <div className="min-h-screen" />;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/"><Wordmark /></Link>
      </div>
      <button className="mx-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-left hover:border-line-strong">
        <span className="grid size-6 place-items-center rounded-md bg-ink text-[11px] font-semibold text-white">{user.name[0]?.toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name.split(" ")[0]}&apos;s workspace</span>
          <span className="block text-[11px] text-ink-3">Free plan</span>
        </span>
        <ChevronsUpDown className="size-3.5 text-ink-3" />
      </button>
      <nav className="mt-4 space-y-0.5 px-2">
        {NAV.map((n) => {
          const active = n.href === path;
          return (
            <Link
              key={n.label}
              href={n.href}
              onClick={() => setOpen(false)}
              className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px]", active ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2 hover:bg-surface/70 hover:text-ink")}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 p-3">
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium">Build credits</span>
            <span className="font-mono text-ink-3">38 / 50</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-sunken">
            <div className="h-full w-[76%] rounded-full bg-bp" />
          </div>
          <button onClick={() => router.push("/settings?tab=billing")} className="mt-2 text-[12px] font-medium text-bp hover:underline">Upgrade for more</button>
        </div>
        {mode === "demo" && <p className="rounded-md bg-warn-50 px-2 py-1.5 text-[11.5px] text-warn">Demo mode · data stays in this browser</p>}
        <div className="flex items-center gap-2 px-1">
          <Avatar name={user.name} src={user.avatar} size={26} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{user.email}</span>
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="rounded-md p-1 text-ink-3 hover:bg-surface hover:text-ink"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-sunken/50 md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 border-r border-line bg-paper" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex h-12 items-center border-b border-line px-4 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 hover:bg-sunken">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="ml-2"><Wordmark /></span>
        </div>
        {children}
      </div>
    </div>
  );
}
