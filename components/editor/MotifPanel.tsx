"use client";

import { Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { rotatedFootprint } from "@/lib/grid";
import { MOTIF_CATEGORIES, MOTIF_LIST, MOTIF_WORDS, type Motif, type MotifCategory, type MotifId } from "@/lib/motifs";
import { getThread, resolveColor } from "@/lib/palette";
import ColorDropdown from "../ui/ColorDropdown";

function MotifPreview({ motif, color, detail, bg }: { motif: Motif; color: string; detail: string; bg: string }) {
  const rows = motif.bitmap.length;
  const cols = Math.max(...motif.bitmap.map((r) => r.length));
  const s = 6;
  return (
    <svg viewBox={`-3 -3 ${cols * s + 6} ${rows * s + 6}`} className="h-14 w-14" aria-hidden="true">
      <rect x={-3} y={-3} width={cols * s + 6} height={rows * s + 6} rx={8} fill={getThread(bg).hex} stroke="rgba(0,0,0,.08)" />
      {motif.bitmap.flatMap((line, y) =>
        line.split("").map((ch, x) =>
          ch === "#" || ch === "+" ? (
            <rect key={`${x}-${y}`} x={x * s + 0.5} y={y * s + 0.5} width={s - 1} height={s - 1} rx={2} fill={getThread(ch === "#" ? color : detail).hex} stroke="rgba(0,0,0,.12)" strokeWidth={0.5} />
          ) : null,
        ),
      )}
    </svg>
  );
}

export default function MotifPanel({
  color,
  onColor,
  bg,
  height,
  onInsert,
}: {
  color: string;
  bg: string;
  onColor: (id: string) => void;
  height: number;
  onInsert: (id: MotifId, row: number, color: string, detail: string) => void;
}) {
  const [row, setRow] = useState(3);
  const [twoTone, setTwoTone] = useState(true);
  const [category, setCategory] = useState<MotifCategory | "all">("all");
  const [query, setQuery] = useState("");
  const safeRow = Math.min(Math.max(1, row), height);

  // Search matches names and the same everyday words the AI understands ("puppy" finds the dog).
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOTIF_LIST.filter((m) => category === "all" || m.category === category);
    const viaWords = new Set(Object.entries(MOTIF_WORDS).filter(([w]) => w.startsWith(q)).map(([, id]) => id));
    return MOTIF_LIST.filter((m) => m.name.toLowerCase().includes(q) || viaWords.has(m.id));
  }, [category, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush">
          <Heart className="h-4 w-4 text-berry" />
        </span>
        <div>
          <h3 className="section-title leading-tight">Add a motif</h3>
          <p className="text-xs text-muted">Tap one to place it. It turns sideways so it&apos;s upright when worn.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Colour</span>
          <ColorDropdown value={color} onChange={onColor} label="Motif colour" />
        </div>
        <div>
          <label className="label" htmlFor="motif-row">Start at row</label>
          <input id="motif-row" type="number" min={1} max={height} className="input" value={row} onChange={(e) => setRow(Number(e.target.value) || 1)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-berry" checked={twoTone} onChange={(e) => setTwoTone(e.target.checked)} />
        Use detail colours (flower centres, cherry stems…)
      </label>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input pl-9"
            placeholder={`Search ${MOTIF_LIST.length} motifs`}
            aria-label="Search motifs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!query.trim() && (
          <div className="flex flex-wrap gap-1.5">
            {[{ id: "all" as const, name: "All" }, ...MOTIF_CATEGORIES].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  category === c.id ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!shown.length && <p className="text-sm text-muted">No motifs match “{query.trim()}”.</p>}
      <div className="grid grid-cols-3 gap-2">
        {shown.map((m) => {
          const detail = twoTone && m.detail ? resolveColor(m.detail) : color;
          return (
            <button
              key={m.id}
              onClick={() => {
                onInsert(m.id, safeRow - 1, color, detail);
                setRow(safeRow + rotatedFootprint(m.bitmap).rows + 2);
              }}
              className="group flex flex-col items-center gap-1 rounded-2xl border border-line bg-white p-2 transition hover:-translate-y-0.5 hover:border-berry/40 hover:shadow-soft"
            >
              <MotifPreview motif={m} color={color} detail={detail} bg={bg} />
              <span className="text-[11px] font-bold text-muted group-hover:text-ink">{m.name}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">Tip: each tap moves the start row down, so you can tap motifs one after another to stack them.</p>
    </div>
  );
}
