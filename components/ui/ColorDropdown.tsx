"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getThread, THREADS } from "@/lib/palette";

export default function ColorDropdown({
  value,
  onChange,
  options = THREADS.map((t) => t.id),
  label,
  align = "left",
}: {
  value: string;
  onChange: (id: string) => void;
  options?: string[];
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = getThread(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-2xl border border-line bg-white px-2.5 py-1.5 text-sm font-semibold transition hover:border-berry/40"
      >
        <span className="h-5 w-5 shrink-0 rounded-full border border-black/15" style={{ background: t.hex }} />
        <span className="truncate capitalize">{t.name}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted" />
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1.5 w-56 animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-soft ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {options.map((id) => {
              const c = getThread(id);
              return (
                <button
                  key={id}
                  type="button"
                  title={c.name}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border border-black/15 transition hover:scale-110 ${id === value ? "ring-2 ring-berry ring-offset-2" : ""}`}
                  style={{ background: c.hex }}
                >
                  {id === value && <Check className="h-3.5 w-3.5" style={{ color: id === "white" || id === "cream" || id === "yellow" ? "#3B2F3A" : "#fff" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
