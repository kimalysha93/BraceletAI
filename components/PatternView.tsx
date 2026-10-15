"use client";

import { ArrowLeft, CalendarDays, GitFork, Minus, Plus, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { downloadNormalPng } from "@/lib/exportNormalPng";
import { downloadPatternPng } from "@/lib/exportPng";
import { useLibrary } from "@/lib/libraryClient";
import { simulate } from "@/lib/normal";
import { patternHref } from "@/lib/site";
import { isTraditional, type PatternSource } from "@/lib/types";
import ExportButton from "./ExportButton";
import KnotGrid, { type Orientation } from "./KnotGrid";
import Legend from "./Legend";
import BraceletStrip from "./normal/BraceletStrip";
import NormalDiagram from "./normal/NormalDiagram";
import NormalStringPanel from "./normal/NormalStringPanel";
import StringCalculator from "./StringCalculator";
import { useToast } from "./ui/Toast";

const SOURCE_LABEL: Record<PatternSource, string> = {
  manual: "Hand drawn",
  motif: "Made with motifs",
  text: "Word pattern",
  ai: "Started with AI",
  photo: "From a photo",
  remix: "Remix",
};

export default function PatternView({ id }: { id: string }) {
  const toast = useToast();
  const patterns = useLibrary();
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [cell, setCell] = useState(18);

  if (!patterns) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="card h-96 animate-pulse bg-white/60" />
      </main>
    );
  }

  const p = patterns.find((x) => x.id === id);
  if (!p) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">We couldn&apos;t find that pattern</h1>
        <p className="mt-2 text-muted">It may have been published from another browser on this demo.</p>
        <Link href="/library" className="btn-primary mt-6">
          Back to the library
        </Link>
      </main>
    );
  }

  const original = p.remixedFrom ? patterns.find((x) => x.id === p.remixedFrom) : undefined;
  const remixes = patterns.filter((x) => x.remixedFrom === p.id);

  const trad = isTraditional(p);
  // Cheap to work out, and can't be a hook after the early returns above.
  const sim = trad ? simulate(p.normal) : null;

  const exportPng = async (mirrored: boolean) => {
    try {
      if (trad) await downloadNormalPng(p.normal, p.title, { mirrored, author: p.author });
      else await downloadPatternPng(p.grid, p.title, p.author, { mirrored });
      toast(mirrored ? "Mirrored PNG downloaded." : "PNG downloaded.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't export.", "warn");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-6 pb-16">
      <Link href="/library" className="btn-ghost no-print mb-3 -ml-3">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card overflow-hidden">
          <div className="space-y-3 border-b border-line p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold">{p.title}</h1>
                <p className="mt-0.5 text-muted">
                  by <span className="font-bold text-ink">{p.author}</span> ·{" "}
                  {trad ? `Traditional · ${p.width} strings · ${p.height}-row repeat` : `${p.width} × ${p.height} knots`} · {p.palette.length} colours
                </p>
              </div>
              <div className="no-print flex flex-wrap gap-2">
                <Link href={`${trad ? "/create/normal" : "/create"}?remix=${encodeURIComponent(p.id)}`} className="btn-primary">
                  <GitFork className="h-4 w-4" /> Remix
                </Link>
                <ExportButton onExport={exportPng} />
                <button className="btn-soft" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip">
                <Sparkles className="h-3.5 w-3.5 text-berry" /> {SOURCE_LABEL[p.source]}
              </span>
              <span className="chip">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {p.tags.map((t) => (
                <Link key={t} href={`/library?q=${encodeURIComponent(t)}`} className="chip no-print text-muted hover:border-berry/40">
                  #{t}
                </Link>
              ))}
              {remixes.length > 0 && (
                <span className="chip border-lav-soft bg-lav-soft text-purple-700">
                  <GitFork className="h-3.5 w-3.5" /> {remixes.length} remix{remixes.length === 1 ? "" : "es"}
                </span>
              )}
            </div>
            {p.remixedFrom && (
              <p className="text-sm text-muted">
                Remixed from{" "}
                {original ? (
                  <Link href={patternHref(original.id)} className="font-bold text-berry-dark hover:underline">
                    {original.title}
                  </Link>
                ) : (
                  "another pattern"
                )}
                {original && <> by {original.author}</>}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream/60 px-5 py-3">
            {/* For traditional patterns: how many knots of each colour show in one repeat. */}
            <Legend grid={trad ? sim!.colors : p.grid} />
            <div className="no-print ml-auto flex items-center gap-1.5">
              <button className="icon-btn h-8 w-8" onClick={() => setCell((c) => Math.max(8, c - 3))} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
              </button>
              <button className="icon-btn h-8 w-8" onClick={() => setCell((c) => Math.min(32, c + 3))} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
              </button>
              <div className={`flex rounded-full border border-line bg-white p-0.5 ${trad ? "hidden" : ""}`}>
                {(
                  [
                    ["vertical", "Pattern"],
                    ["horizontal", "Bracelet"],
                  ] as const
                ).map(([o, label]) => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    className={`rounded-full px-3 py-1 text-sm font-bold transition ${orientation === o ? "bg-berry text-white" : "text-muted hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-auto p-6">
            <div className="flex justify-center">
              {trad ? (
                <div className="flex min-w-0 flex-col items-center gap-5">
                  <div className="max-w-full overflow-x-auto">
                    <BraceletStrip pattern={p.normal} sim={sim!} knot={10} rows={Math.max(p.height * 2, 64)} />
                  </div>
                  <NormalDiagram pattern={p.normal} sim={sim!} cell={Math.max(14, cell + 4)} />
                </div>
              ) : (
                <KnotGrid grid={p.grid} cell={orientation === "horizontal" ? Math.min(cell, 14) : cell} orientation={orientation} />
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-5">
            {trad ? <NormalStringPanel pattern={p.normal} /> : <StringCalculator grid={p.grid} patternId={p.id} />}
          </div>
          {remixes.length > 0 && (
            <div className="card no-print p-5">
              <h3 className="section-title mb-2">Remixes</h3>
              <ul className="space-y-1">
                {remixes.map((r) => (
                  <li key={r.id}>
                    <Link href={patternHref(r.id)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-blush/50">
                      <GitFork className="h-3.5 w-3.5 text-purple-500" />
                      <span className="font-bold">{r.title}</span>
                      <span className="text-muted">by {r.author}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <p className="print-only mt-6 text-center text-xs text-gray-500">Made with {APP_NAME}</p>
    </main>
  );
}
