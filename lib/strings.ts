import { countColors, type Grid } from "./grid";
import { getThread } from "./palette";
import {
  BASE_STRING_OFFSET,
  CARRY_FACTOR,
  CM_PER_INCH,
  KNOT_LENGTH_CM,
  ROW_HEIGHT_CM,
  START_ALLOWANCE_CM,
  type StartMethod,
} from "./stringConfig";

export type StringSettings = {
  /** A length to repeat the pattern up to. Unset = the bracelet is as long as the pattern. */
  customLengthCm?: number;
  tailCm: number;
  startMethod: StartMethod;
  unit: "cm" | "in";
  baseColor?: string; // defaults to the pattern background
  knotLengthCm?: number; // calibrated override
};

export type WorkingString = { colorId: string; name: string; hex: string; knots: number; cutCm: number };

export type StringPlan = {
  baseCount: number;
  baseColor: string;
  baseCutCm: number; // each string as cut
  basePieces: { count: number; cutCm: number }[]; // what to actually cut (loop start folds strings)
  working: WorkingString[];
  totals: { colorId: string; name: string; hex: string; cm: number }[];
  repeats: number;
  patternLengthCm: number;
  finishedLengthCm: number;
  isCustomLength: boolean;
  note: string;
  knotLengthCm: number;
};

export function calculateStrings(grid: Grid, s: StringSettings): StringPlan {
  const width = grid[0]?.length ?? 0;
  const rows = grid.length;
  const knotLength = s.knotLengthCm ?? KNOT_LENGTH_CM;
  const counts = countColors(grid);
  const baseColor = s.baseColor ?? counts[0]?.id ?? "white";

  // How many times the pattern repeats to reach the finished length.
  const patternLengthCm = rows * ROW_HEIGHT_CM;
  const isCustomLength = s.customLengthCm != null && s.customLengthCm > 0;
  const finishedLengthCm = isCustomLength ? s.customLengthCm! : patternLengthCm;
  const repeats = Math.max(1, finishedLengthCm / Math.max(patternLengthCm, 0.1));

  const baseCount = width + BASE_STRING_OFFSET;
  // Never cut base strings shorter than the pattern itself.
  const baseCutCm = Math.max(finishedLengthCm, patternLengthCm) + 2 * s.tailCm + START_ALLOWANCE_CM[s.startMethod];

  let basePieces: StringPlan["basePieces"];
  if (s.startMethod === "loop") {
    // Folded in half at the loop: cut half as many at double length.
    const folded = Math.floor(baseCount / 2);
    basePieces = [{ count: folded, cutCm: baseCutCm * 2 }];
    if (baseCount % 2) basePieces.push({ count: 1, cutCm: baseCutCm });
  } else {
    basePieces = [{ count: baseCount, cutCm: baseCutCm }];
  }

  const working: WorkingString[] = counts.map(({ id, count }) => {
    const t = getThread(id);
    const knots = Math.round(count * repeats);
    return { colorId: id, name: t.name, hex: t.hex, knots, cutCm: knots * knotLength * CARRY_FACTOR + 2 * s.tailCm };
  });

  const totalsMap = new Map<string, number>();
  for (const w of working) totalsMap.set(w.colorId, (totalsMap.get(w.colorId) ?? 0) + w.cutCm);
  const baseTotal = basePieces.reduce((sum, p) => sum + p.count * p.cutCm, 0);
  totalsMap.set(baseColor, (totalsMap.get(baseColor) ?? 0) + baseTotal);
  const totals = [...totalsMap.entries()]
    .map(([id, cm]) => ({ colorId: id, name: getThread(id).name, hex: getThread(id).hex, cm }))
    .sort((a, b) => b.cm - a.cm);

  const baseName = getThread(baseColor).name;
  const piece = basePieces[0];
  const note =
    s.startMethod === "loop"
      ? `Cut ${piece.count} ${baseName} base string${piece.count === 1 ? "" : "s"} at ${formatLength(piece.cutCm, s.unit)} and fold them in half for ${baseCount} strings${basePieces[1] ? `, plus 1 more at ${formatLength(basePieces[1].cutCm, s.unit)}` : ""}.`
      : `Cut ${baseCount} ${baseName} base strings at ${formatLength(baseCutCm, s.unit)}.`;

  return { baseCount, baseColor, baseCutCm, basePieces, working, totals, repeats, patternLengthCm, finishedLengthCm, isCustomLength, note, knotLengthCm: knotLength };
}

export function formatLength(cm: number, unit: "cm" | "in"): string {
  if (unit === "in") return `${Math.round(cm / CM_PER_INCH)} in`;
  if (cm >= 200) return `${(cm / 100).toFixed(1)} m`;
  return `${Math.round(cm)} cm`;
}

/** Work out a new knot length from a real bracelet. */
export function calibrateKnotLength(knots: number, threadUsedCm: number, workingStrings: number, tailCm: number): number | null {
  if (knots <= 0 || threadUsedCm <= 0) return null;
  const usable = threadUsedCm - workingStrings * 2 * tailCm;
  if (usable <= 0) return null;
  const v = usable / (knots * CARRY_FACTOR);
  return Math.round(v * 100) / 100;
}
