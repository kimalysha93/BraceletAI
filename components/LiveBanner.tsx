"use client";

import { Code, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LIVE_SITE, REPO_URL } from "@/lib/site";

/**
 * Explains the live preview. Its height is shared as --banner-h so the full-height editors still fit.
 * Closing it lasts until the next full page load (the layout stays mounted while navigating).
 */
export default function LiveBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el || hidden) {
      root.style.setProperty("--banner-h", "0px");
      return;
    }
    const update = () => root.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hidden]);

  if (!LIVE_SITE || hidden) return null;

  return (
    <div ref={ref} className="no-print border-b border-berry/20 bg-ink text-white" role="note">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 text-[13px] leading-snug">
        <Info className="h-4 w-4 shrink-0 text-pink-200" />
        <p className="flex-1">
          <b>Live preview.</b> The AI and publishing to the library are turned off here. The Describe box uses a simple keyword helper
          instead, and anything you make stays in your own browser.
        </p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="hidden shrink-0 items-center gap-1 font-bold text-pink-200 hover:underline sm:flex">
          <Code className="h-4 w-4" /> Code
        </a>
        <button onClick={() => setHidden(true)} className="rounded-full p-1 hover:bg-white/10" aria-label="Hide this message">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
