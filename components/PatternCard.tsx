import { GitFork } from "lucide-react";
import Link from "next/link";
import { simulate, type NormalPattern } from "@/lib/normal";
import { patternHref } from "@/lib/site";
import { isTraditional, type LibraryPattern } from "@/lib/types";
import BraceletThumb from "./BraceletThumb";
import BraceletStrip from "./normal/BraceletStrip";

export default function PatternCard({ pattern, remixes = 0 }: { pattern: LibraryPattern; remixes?: number }) {
  const traditional = isTraditional(pattern);
  return (
    <Link
      href={patternHref(pattern.id)}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_14px_30px_-12px_rgb(120_60_90/0.3)]"
    >
      <div className="flex h-28 items-center bg-gradient-to-br from-blush/60 to-lav-soft/50 px-3">
        {traditional ? <TraditionalThumb pattern={pattern.normal} /> : <BraceletThumb grid={pattern.grid} maxWidth={300} />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] leading-tight font-semibold group-hover:text-berry-dark">{pattern.title}</h3>
          <div className="flex shrink-0 -space-x-1.5 pt-0.5">
            {pattern.palette.slice(0, 5).map((c) => (
              <span key={c.id} className="h-4 w-4 rounded-full border-2 border-white" style={{ background: c.hex }} title={c.name} />
            ))}
          </div>
        </div>
        <p className="text-sm text-muted">by {pattern.author}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs font-semibold text-muted">
          {traditional ? (
            <>
              <span className="rounded-full bg-ink px-2 py-0.5 text-white">Traditional</span>
              <span className="rounded-full bg-cream px-2 py-0.5">{pattern.width} strings</span>
            </>
          ) : (
            <span className="rounded-full bg-cream px-2 py-0.5">
              {pattern.width} × {pattern.height}
            </span>
          )}
          <span className="rounded-full bg-cream px-2 py-0.5">{pattern.palette.length} colours</span>
          {remixes > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-lav-soft px-2 py-0.5 text-purple-700">
              <GitFork className="h-3 w-3" /> {remixes}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// No hooks here: PatternCard also renders on the server (home page).
function TraditionalThumb({ pattern }: { pattern: NormalPattern }) {
  const sim = simulate(pattern);
  // Repeat to roughly a bracelet's length so short repeats still fill the card.
  return <BraceletStrip pattern={pattern} sim={sim} rows={Math.max(48, pattern.knots.length * 2)} fluid />;
}
