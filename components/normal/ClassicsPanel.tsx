"use client";

import { Shapes } from "lucide-react";
import { useMemo, useState } from "react";
import { buildStyle, NORMAL_STYLES, simulate, STYLE_INFO, suggestedStrings, type NormalPattern, type NormalStyle } from "@/lib/normal";
import { getThread } from "@/lib/palette";
import BraceletStrip from "./BraceletStrip";

/** One-click classic styles, previewed in the colours already on the bracelet. */
export default function ClassicsPanel({
  colors,
  strings,
  borderColor,
  onPick,
}: {
  colors: string[];
  strings: number;
  borderColor: string;
  onPick: (style: NormalStyle, p: NormalPattern) => void;
}) {
  const [border, setBorder] = useState(false);
  const edge = border ? borderColor : undefined;
  const options = useMemo(
    () =>
      NORMAL_STYLES.map((style) => {
        // Keep the current width, but give styles that need room (double chevron, criss-cross) enough strings.
        const p = buildStyle(style, colors, Math.max(strings, suggestedStrings(style, 1) + (edge ? 2 : 0)), edge);
        return { style, p, sim: simulate(p) };
      }),
    [colors, strings, edge],
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
      <button
        onClick={() => setBorder((b) => !b)}
        title="Adds a solid string down each edge, in the colour selected on the left"
        className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition ${border ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
      >
        <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: getThread(borderColor).hex }} />
        Add a <span className="capitalize">{getThread(borderColor).name}</span> border
        <span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition ${border ? "bg-berry" : "bg-line"}`}>
          <span className={`block h-4 w-4 rounded-full bg-white shadow transition ${border ? "translate-x-4" : ""}`} />
        </span>
      </button>
      <div className="space-y-2">
        {options.map(({ style, p, sim }) => (
          <button
            key={style}
            onClick={() => onPick(style, p)}
            className="block w-full overflow-hidden rounded-2xl border border-line bg-white p-2.5 text-left transition hover:border-berry/40 hover:bg-blush/40"
          >
            <span className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{STYLE_INFO[style].name}</span>
              <span className="truncate text-[11px] text-muted">
                {STYLE_INFO[style].hint} · {p.strings.length} strings
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
