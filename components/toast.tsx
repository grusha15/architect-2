"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

type Tone = "ok" | "info" | "warn";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="anim-rise flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-[13px] text-white shadow-lg">
            {t.tone === "ok" ? <CircleCheck className="size-4 text-emerald-400" /> : t.tone === "warn" ? <TriangleAlert className="size-4 text-amber-400" /> : <Info className="size-4 text-sky-300" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
