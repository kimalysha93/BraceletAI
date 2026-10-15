"use client";

import { ChevronDown, Download, FlipHorizontal2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** PNG export with a choice of the pattern as drawn or mirrored left ↔ right. */
export default function ExportButton({ onExport }: { onExport: (mirrored: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (mirrored: boolean) => {
    setOpen(false);
    onExport(mirrored);
  };

  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold text-ink hover:bg-blush/60";

  return (
    <div ref={ref} className="relative">
      <button className="btn-soft" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Download className="h-4 w-4" /> PNG <ChevronDown className="-ml-0.5 h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-60 rounded-2xl border border-line bg-white p-1.5 shadow-soft">
          <button role="menuitem" className={item} onClick={() => pick(false)}>
            <Download className="h-4 w-4 text-muted" />
            <span>
              As drawn
              <span className="block text-xs font-semibold text-muted">The pattern exactly as it is</span>
            </span>
          </button>
          <button role="menuitem" className={item} onClick={() => pick(true)}>
            <FlipHorizontal2 className="h-4 w-4 text-muted" />
            <span>
              Mirrored
              <span className="block text-xs font-semibold text-muted">Flipped left ↔ right</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
