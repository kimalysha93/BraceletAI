"use client";

import { Ruler, Scissors } from "lucide-react";
import { useMemo, useState } from "react";
import type { NormalPattern } from "@/lib/normal";
import { calculateNormalStrings } from "@/lib/normalStrings";
import { getThread } from "@/lib/palette";
import { CM_PER_INCH, NORMAL_DEFAULT_LENGTH_CM, type StartMethod } from "@/lib/stringConfig";
import { formatLength } from "@/lib/strings";
import { useStringSettings } from "@/lib/stringSettingsStore";

const METHODS: { id: StartMethod; label: string; hint: string }[] = [
  { id: "loop", label: "Loop", hint: "Fold strings in half and tie a loop at the top" },
  { id: "braid", label: "Braid", hint: "Braid the ends before you start" },
  { id: "tape", label: "Tape", hint: "Tape straight strings down and tie off later" },
];

function Swatch({ id, size = 14 }: { id: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full border border-black/15" style={{ background: getThread(id).hex, width: size, height: size }} />;
}

export function useNormalPlan(pattern: NormalPattern) {
  const store = useStringSettings();
  const plan = useMemo(() => calculateNormalStrings(pattern, store.settings), [pattern, store.settings]);
  return { plan, ...store };
}

export function NormalStringSummary({ pattern, onOpen }: { pattern: NormalPattern; onOpen?: () => void }) {
  const { plan, settings } = useNormalPlan(pattern);
  return (
    <div className="rounded-2xl bg-blush/70 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-berry-dark uppercase">
          <Scissors className="h-3.5 w-3.5" /> Cut list
        </span>
        {onOpen && (
          <button onClick={onOpen} className="text-xs font-bold text-berry-dark hover:underline">
            Details
          </button>
        )}
      </div>
      <p className="text-[13px] leading-snug font-semibold">{plan.note}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {plan.totals.map((t) => (
          <span key={t.colorId} className="chip py-0.5 text-[11px]">
            <Swatch id={t.colorId} size={10} />
            {formatLength(t.cm, settings.unit)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function NormalStringPanel({ pattern }: { pattern: NormalPattern }) {
  const { plan, settings, update } = useNormalPlan(pattern);
  const unit = settings.unit;
  const toUnit = (cm: number) => (unit === "in" ? Math.round((cm / CM_PER_INCH) * 10) / 10 : Math.round(cm * 10) / 10);
  const fromUnit = (v: number) => (unit === "in" ? v * CM_PER_INCH : v);
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);
  const rows = pattern.knots.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-butter">
          <Ruler className="h-4 w-4 text-amber-600" />
        </span>
        <h3 className="section-title">How much string?</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="nlen">Bracelet length</label>
          <input
            id="nlen"
            type="number"
            min={1}
            step={unit === "in" ? 0.5 : 1}
            className="input"
            value={lengthDraft ?? toUnit(plan.finishedLengthCm)}
            onChange={(e) => {
              setLengthDraft(e.target.value);
              const v = Number(e.target.value);
              if (v > 0) update({ customLengthCm: fromUnit(v) });
            }}
            onBlur={() => setLengthDraft(null)}
          />
          {plan.isCustomLength ? (
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Custom length.{" "}
              <button
                className="font-bold text-berry-dark hover:underline"
                onClick={() => {
                  setLengthDraft(null);
                  update({ customLengthCm: undefined });
                }}
              >
                Use {formatLength(NORMAL_DEFAULT_LENGTH_CM, unit)}
              </button>
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-muted">A typical wrist. Type your own size.</p>
          )}
        </div>
        <div>
          <span className="label">Units</span>
          <div className="flex rounded-full border border-line bg-white p-0.5">
            {(["cm", "in"] as const).map((u) => (
              <button
                key={u}
                onClick={() => update({ unit: u })}
                className={`flex-1 rounded-full py-1.5 text-sm font-bold transition ${unit === u ? "bg-berry text-white" : "text-muted hover:text-ink"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <span className="label">How you start</span>
          <div className="grid grid-cols-3 gap-1.5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                title={m.hint}
                onClick={() => update({ startMethod: m.id })}
                className={`rounded-2xl border px-2 py-1.5 text-sm font-bold transition ${settings.startMethod === m.id ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="ntail">Extra for tying</label>
          <input
            id="ntail"
            type="number"
            min={0}
            className="input"
            value={toUnit(settings.tailCm)}
            onChange={(e) => update({ tailCm: Math.max(0, fromUnit(Number(e.target.value) || 0)) })}
          />
          <p className="mt-1 text-[11px] leading-snug text-muted">Loose string at each end for tying it on.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-blush/70 p-3.5">
        <p className="flex gap-2 text-sm leading-snug font-bold">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-berry" />
          {plan.note}
        </p>
        <p className="mt-1.5 pl-6 text-xs text-muted">
          One repeat ({rows} rows) is about {formatLength(plan.patternLengthCm, unit)}, so knot it about {plan.repeats.toFixed(1)}× to reach{" "}
          {formatLength(plan.finishedLengthCm, unit)}.
        </p>
      </div>

      <div>
        <span className="label">What to cut</span>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {plan.pieces.map((p) => (
            <li key={p.labels.join("")} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <Swatch id={p.colorId} size={16} />
              <span className="font-semibold capitalize">{getThread(p.colorId).name}</span>
              <span className="text-xs text-muted">
                {p.labels.length === 2 ? `strings ${p.labels.join(" + ")}, folded` : `string ${p.labels[0]}`}
              </span>
              <span className="ml-auto font-bold tabular-nums">{formatLength(p.cutCm, unit)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[11px] leading-snug text-muted">
          Strings that tie more knots (the colours you see most) are cut longer. Letters match the top of the pattern.
        </p>
      </div>

      <div>
        <span className="label">Shopping list (total per colour)</span>
        <div className="flex flex-wrap gap-1.5">
          {plan.totals.map((t) => (
            <span key={t.colorId} className="chip">
              <Swatch id={t.colorId} size={12} />
              <span className="capitalize">{t.name}</span>
              <span className="text-muted">{formatLength(t.cm, unit)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
