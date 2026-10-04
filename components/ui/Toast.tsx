"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "info" | "warn";
type Toast = { id: number; message: ReactNode; tone: Tone };

const ToastContext = createContext<(message: ReactNode, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const show = useCallback((message: ReactNode, tone: Tone = "success") => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warn" ? TriangleAlert : Info;
          const color = t.tone === "success" ? "text-emerald-500" : t.tone === "warn" ? "text-amber-500" : "text-berry";
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex max-w-md animate-pop-in items-center gap-3 rounded-2xl border border-line bg-white py-2.5 pr-2 pl-4 text-sm font-semibold shadow-soft"
            >
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div className="flex-1">{t.message}</div>
              <button className="btn-ghost h-7 w-7 p-0" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
