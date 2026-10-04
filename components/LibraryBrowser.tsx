"use client";

import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { remixCount, useLibrary } from "@/lib/libraryClient";
import PatternCard from "./PatternCard";

const WIDTHS = [
  { id: "any", label: "Any width", test: () => true },
  { id: "narrow", label: "Narrow (≤10)", test: (w: number) => w <= 10 },
  { id: "medium", label: "Medium (11–15)", test: (w: number) => w >= 11 && w <= 15 },
  { id: "wide", label: "Wide (16+)", test: (w: number) => w >= 16 },
];

// Lengths in rows, labelled with roughly how long they knot up (0.4 cm per row).
const LENGTHS = [
  { id: "any", label: "Any length", hint: "", test: () => true },
  { id: "short", label: "Short / kids", hint: "Up to 35 rows (about 14 cm)", test: (h: number) => h <= 35 },
  { id: "standard", label: "Standard", hint: "36 to 60 rows (about 14–24 cm)", test: (h: number) => h >= 36 && h <= 60 },
  { id: "long", label: "Long / anklets", hint: "61+ rows (24 cm or more)", test: (h: number) => h > 60 },
];

const COLORS = [
  { id: "any", label: "Any", test: () => true },
  { id: "2", label: "2", test: (n: number) => n <= 2 },
  { id: "3", label: "3", test: (n: number) => n === 3 },
  { id: "4", label: "4+", test: (n: number) => n >= 4 },
];

export default function LibraryBrowser() {
  const patterns = useLibrary();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [width, setWidth] = useState("any");
  const [length, setLength] = useState("any");
  const [colors, setColors] = useState("any");

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of patterns ?? []) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);
  }, [patterns]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const wTest = WIDTHS.find((w) => w.id === width)!.test;
    const lTest = LENGTHS.find((l) => l.id === length)!.test;
    const cTest = COLORS.find((c) => c.id === colors)!.test;
    return (patterns ?? []).filter(
      (p) =>
        (!query ||
          p.title.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query) ||
          p.tags.some((t) => t.includes(query))) &&
        wTest(p.width) &&
        lTest(p.height) &&
        cTest(p.palette.length),
    );
  }, [patterns, q, width, length, colors]);

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-bold transition ${active ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Pattern library</h1>
          <p className="text-muted">Patterns shared by makers. Open one to see string lengths, or remix it into your own.</p>
        </div>
        <Link href="/create?new=1" className="btn-primary">
          <Plus className="h-4 w-4" /> New pattern
        </Link>
      </div>

      <div className="card mb-6 space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-faint" />
          <input className="input rounded-full py-2.5 pl-10" placeholder="Search by name, maker or tag (try “hearts”)" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && (
            <button className="btn-ghost absolute top-1/2 right-1.5 h-8 w-8 -translate-y-1/2 p-0" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {WIDTHS.map((w) => (
            <button key={w.id} className={pill(width === w.id)} onClick={() => setWidth(w.id)}>
              {w.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-line" />
          {LENGTHS.map((l) => (
            <button key={l.id} className={pill(length === l.id)} title={l.hint || undefined} onClick={() => setLength(l.id)}>
              {l.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-line" />
          <span className="text-sm font-bold text-muted">Colours:</span>
          {COLORS.map((c) => (
            <button key={c.id} className={pill(colors === c.id)} onClick={() => setColors(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        {popularTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-faint">Popular:</span>
            {popularTags.map((t) => (
              <button key={t} onClick={() => setQ(t)} className="chip hover:border-berry/40">
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!patterns ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card h-56 animate-pulse bg-white/60" />
          ))}
        </div>
      ) : results.length ? (
        <>
          <p className="mb-3 text-sm font-semibold text-muted">
            {results.length} pattern{results.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p) => (
              <PatternCard key={p.id} pattern={p} remixes={remixCount(patterns, p.id)} />
            ))}
          </div>
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-lg font-semibold">No patterns match yet</p>
          <p className="mt-1 text-sm text-muted">Try another search, or be the first to make one!</p>
          <Link href="/create?mode=ai" className="btn-primary mt-4">
            Make one now
          </Link>
        </div>
      )}
    </main>
  );
}
