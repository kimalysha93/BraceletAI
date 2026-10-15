"use client";

import { ChevronDown, Frown, Ruler, Scissors, Smile, Meh } from "lucide-react";
import { useMemo, useState } from "react";
import { countColors, type Grid } from "@/lib/grid";
import { getThread } from "@/lib/palette";
import { LIVE_SITE } from "@/lib/site";
import { KEYS, loadLocal, saveLocal } from "@/lib/storage";
import { CM_PER_INCH, type StartMethod } from "@/lib/stringConfig";
import { calculateStrings, calibrateKnotLength, formatLength } from "@/lib/strings";
import { useStringSettings } from "@/lib/stringSettingsStore";
import { useToast } from "./ui/Toast";

const METHODS: { id: StartMethod; label: string; hint: string }[] = [
  { id: "loop", label: "Loop", hint: "Fold strings in half and tie a loop at the top" },
  { id: "braid", label: "Braid", hint: "Braid the ends before you start" },
  { id: "tape", label: "Tape", hint: "Tape straight strings down and tie off later" },
];

function Swatch({ hex, size = 14 }: { hex: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full border border-black/15" style={{ background: hex, width: size, height: size }} />;
}

/** The plan for the current settings, shared by the summary and the full panel. */
export function useStringPlan(grid: Grid) {
  const store = useStringSettings();
  const plan = useMemo(() => {
    const counts = countColors(grid).map((c) => c.id);
    const baseColor = store.settings.baseColor && counts.includes(store.settings.baseColor) ? store.settings.baseColor : undefined;
    return calculateStrings(grid, { ...store.settings, baseColor });
  }, [grid, store.settings]);
  return { plan, ...store };
}

export function StringSummary({ grid, onOpen }: { grid: Grid; onOpen?: () => void }) {
  const { plan, settings } = useStringPlan(grid);
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
        {plan.working.map((w) => (
          <span key={w.colorId} className="chip py-0.5 text-[11px]">
            <Swatch hex={w.hex} size={10} />
            {formatLength(w.cutCm, settings.unit)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StringCalculator({ grid, patternId, compact = false }: { grid: Grid; patternId?: string; compact?: boolean }) {
  const toast = useToast();
  const { plan, settings, update, calibratedKnotLength, defaultKnotLength, setKnotLength } = useStringPlan(grid);
  const unit = settings.unit;
  const toUnit = (cm: number) => (unit === "in" ? Math.round((cm / CM_PER_INCH) * 10) / 10 : Math.round(cm * 10) / 10);
  const fromUnit = (v: number) => (unit === "in" ? v * CM_PER_INCH : v);
  const colors = countColors(grid).map((c) => c.id);
  const [calOpen, setCalOpen] = useState(false);
  const totalKnots = grid.length * (grid[0]?.length ?? 0);
  const [cal, setCal] = useState({ knots: "", used: "", strings: "" });
  // What's being typed in the length box, so clearing it doesn't snap back mid-edit.
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);

  const sendFeedback = async (result: "short" | "long" | "right") => {
    const body = {
      result,
      patternId,
      width: grid[0]?.length,
      height: grid.length,
      finishedLengthCm: plan.finishedLengthCm,
      tailCm: settings.tailCm,
      startMethod: settings.startMethod,
      knotLengthCm: plan.knotLengthCm,
    };
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { persisted?: boolean };
      if (!data.persisted) throw new Error("not saved");
    } catch {
      saveLocal(KEYS.feedback, [...loadLocal<unknown[]>(KEYS.feedback, []), { ...body, at: new Date().toISOString() }]);
    }
    toast(
      result === "right" ? "Yay! Thanks for letting us know." : "Thanks! Reports like this help tune the string maths for everyone.",
      "success",
    );
  };

  const saveCalibration = () => {
    const knots = Number(cal.knots || totalKnots);
    const used = fromUnit(Number(cal.used));
    const strings = Number(cal.strings || colors.length);
    const v = calibrateKnotLength(knots, used, strings, settings.tailCm);
    if (!v) {
      toast("Those numbers don't add up yet. Check the thread used is more than the tails.", "warn");
      return;
    }
    setKnotLength(v);
    setCalOpen(false);
    toast(`Calibrated: ${v} cm of thread per knot.`, "success");
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-butter">
            <Ruler className="h-4 w-4 text-amber-600" />
          </span>
          <h3 className="section-title">How much string?</h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="len">Bracelet length</label>
          <div className="flex items-center gap-1">
            <input
              id="len"
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
          </div>
          {plan.isCustomLength ? (
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Custom length.{" "}
              <button className="font-bold text-berry-dark hover:underline" onClick={() => {
                  setLengthDraft(null);
                  update({ customLengthCm: undefined });
                }}
              >
                Match the {grid.length} rows ({formatLength(plan.patternLengthCm, unit)})
              </button>
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-muted">Matches your {grid.length} rows. Type a length to repeat the pattern.</p>
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
        <div>
          <label className="label" htmlFor="tail" title="Loose string left unknotted at both ends so you can tie the bracelet on">
            Extra for tying
          </label>
          <input
            id="tail"
            type="number"
            min={0}
            className="input"
            value={toUnit(settings.tailCm)}
            onChange={(e) => update({ tailCm: Math.max(0, fromUnit(Number(e.target.value) || 0)) })}
          />
          <p className="mt-1 text-[11px] leading-snug text-muted">Loose string at each end for tying it on.</p>
        </div>
        <div>
          <span className="label">Base strings</span>
          <select
            className="input capitalize"
            value={plan.baseColor}
            onChange={(e) => update({ baseColor: e.target.value })}
          >
            {colors.map((id) => (
              <option key={id} value={id}>
                {getThread(id).name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-blush/70 p-3.5">
        <p className="flex gap-2 text-sm leading-snug font-bold">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-berry" />
          {plan.note}
        </p>
        {plan.isCustomLength && plan.finishedLengthCm < plan.patternLengthCm - 0.05 && (
          <p className="mt-1.5 pl-6 text-xs text-muted">
            That&apos;s shorter than the pattern ({formatLength(plan.patternLengthCm, unit)}), so the base strings are cut for the whole pattern.
          </p>
        )}
        {plan.repeats > 1.05 && (
          <p className="mt-1.5 pl-6 text-xs text-muted">
            The pattern is about {formatLength(plan.patternLengthCm, unit)} long, so repeat it about {plan.repeats.toFixed(1)}× to reach{" "}
            {formatLength(plan.finishedLengthCm, unit)}.
          </p>
        )}
      </div>

      <div>
        <span className="label">Working strings (one per colour)</span>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {plan.working.map((w) => (
            <li key={w.colorId} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <Swatch hex={w.hex} size={16} />
              <span className="font-semibold capitalize">{w.name}</span>
              <span className="text-xs text-muted">{w.knots} knots</span>
              <span className="ml-auto font-bold tabular-nums">{formatLength(w.cutCm, unit)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <span className="label">Shopping list (total per colour)</span>
        <div className="flex flex-wrap gap-1.5">
          {plan.totals.map((t) => (
            <span key={t.colorId} className="chip">
              <Swatch hex={t.hex} size={12} />
              <span className="capitalize">{t.name}</span>
              <span className="text-muted">{formatLength(t.cm, unit)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nobody collects these answers on the live preview, so don't ask. */}
      <div className={`no-print rounded-2xl border border-dashed border-line p-3 ${LIVE_SITE ? "hidden" : ""}`}>
        <p className="mb-2 text-xs font-bold text-muted">Made it? How was the string length?</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button className="btn-soft px-2 text-xs" onClick={() => sendFeedback("short")}>
            <Frown className="h-4 w-4 text-rose-400" /> Ran short
          </button>
          <button className="btn-soft px-2 text-xs" onClick={() => sendFeedback("right")}>
            <Smile className="h-4 w-4 text-emerald-500" /> Just right
          </button>
          <button className="btn-soft px-2 text-xs" onClick={() => sendFeedback("long")}>
            <Meh className="h-4 w-4 text-amber-500" /> Too long
          </button>
        </div>
      </div>

      <div className="no-print">
        <button className="flex w-full items-center justify-between text-xs font-bold text-muted hover:text-ink" onClick={() => setCalOpen((v) => !v)}>
          <span>
            Calibrate with a real bracelet · <span className="text-ink">{plan.knotLengthCm} cm/knot</span>
            {calibratedKnotLength ? " (calibrated)" : ""}
          </span>
          <ChevronDown className={`h-4 w-4 transition ${calOpen ? "rotate-180" : ""}`} />
        </button>
        {calOpen && (
          <div className="mt-2 space-y-2 rounded-2xl bg-cream p-3">
            <p className="text-xs text-muted">
              Enter what a bracelet you&apos;ve finished actually used, and we&apos;ll update how much thread each knot takes.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label text-[10px]">Knots tied</label>
                <input className="input px-2" type="number" placeholder={String(totalKnots)} value={cal.knots} onChange={(e) => setCal({ ...cal, knots: e.target.value })} />
              </div>
              <div>
                <label className="label text-[10px]">Thread used ({unit})</label>
                <input className="input px-2" type="number" placeholder="e.g. 900" value={cal.used} onChange={(e) => setCal({ ...cal, used: e.target.value })} />
              </div>
              <div>
                <label className="label text-[10px]">Colours</label>
                <input className="input px-2" type="number" placeholder={String(colors.length)} value={cal.strings} onChange={(e) => setCal({ ...cal, strings: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveCalibration} disabled={!cal.used}>
                Save calibration
              </button>
              {calibratedKnotLength != null && (
                <button className="btn-soft" onClick={() => setKnotLength(null)}>
                  Reset to {defaultKnotLength}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
