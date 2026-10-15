"use client";

import { Shapes } from "lucide-react";
import { useMemo } from "react";
import { buildStyle, NORMAL_STYLES, simulate, STYLE_INFO, type NormalPattern, type NormalStyle } from "@/lib/normal";
import BraceletStrip from "./BraceletStrip";

/** One-click classic styles, previewed in the colours already on the bracelet. */
export default function ClassicsPanel({ colors, strings, onPick }: { colors: string[]; strings: number; onPick: (style: NormalStyle, p: NormalPattern) => void }) {
  const options = useMemo(
    () =>
      NORMAL_STYLES.map((style) => {
        const p = buildStyle(style, colors, strings);
        return { style, p, sim: simulate(p) };
      }),
    [colors, strings],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush">
          <Shapes className="h-4 w-4 text-berry" />
        </span>
        <div>
          <h3 className="section-title leading-tight">Start from a classic</h3>
          <p className="text-xs text-muted">Shown in your current colours. Change colours on the left, then pick one.</p>
        </div>
      </div>
      <div className="space-y-2">
        {options.map(({ style, p, sim }) => (
          <button
            key={style}
            onClick={() => onPick(style, p)}
            className="block w-full overflow-hidden rounded-2xl border border-line bg-white p-2.5 text-left transition hover:border-berry/40 hover:bg-blush/40"
          >
            <span className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{STYLE_INFO[style].name}</span>
              <span className="text-[11px] text-muted">
                {STYLE_INFO[style].hint} · {p.knots.length} rows
              </span>
            </span>
            <span className="block overflow-hidden rounded-lg">
              <BraceletStrip pattern={p} sim={sim} knot={7} rows={56} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
