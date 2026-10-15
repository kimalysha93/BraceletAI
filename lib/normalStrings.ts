import { simulate, type NormalPattern } from "./normal";
import { getThread } from "./palette";
import { KNOT_LENGTH_CM, NORMAL_DEFAULT_LENGTH_CM, NORMAL_ROW_HEIGHT_CM, START_ALLOWANCE_CM } from "./stringConfig";
import { formatLength, type StringSettings } from "./strings";

export const stringLabel = (i: number) => String.fromCharCode(65 + i);

export type NormalString = { index: number; label: string; colorId: string; name: string; hex: string; knots: number; cutCm: number };
export type NormalPiece = { labels: string[]; colorId: string; cutCm: number };

export type NormalStringPlan = {
  strings: NormalString[];
  /** What to actually cut: with a loop start, neighbouring strings of the same colour are one folded piece. */
  pieces: NormalPiece[];
  totals: { colorId: string; name: string; hex: string; cm: number }[];
  repeats: number;
  patternLengthCm: number;
  finishedLengthCm: number;
  isCustomLength: boolean;
  knotLengthCm: number;
  note: string;
};

/**
 * Every string runs the full length of the bracelet, plus thread for each knot it ties.
 * Strings that tie lots of knots (the colours you see most) need to be longer.
 */
export function calculateNormalStrings(p: NormalPattern, s: StringSettings): NormalStringPlan {
  const sim = simulate(p);
  const knotLength = s.knotLengthCm ?? KNOT_LENGTH_CM;
  const patternLengthCm = p.knots.length * NORMAL_ROW_HEIGHT_CM;
  const isCustomLength = s.customLengthCm != null && s.customLengthCm > 0;
  const finishedLengthCm = isCustomLength ? s.customLengthCm! : NORMAL_DEFAULT_LENGTH_CM;
  const repeats = Math.max(1, finishedLengthCm / Math.max(patternLengthCm, 0.1));
  const extra = 2 * s.tailCm + START_ALLOWANCE_CM[s.startMethod];

  const strings: NormalString[] = p.strings.map((colorId, index) => {
    const t = getThread(colorId);
    const knots = Math.round(sim.tiedCount[index] * repeats);
    return { index, label: stringLabel(index), colorId, name: t.name, hex: t.hex, knots, cutCm: Math.max(finishedLengthCm, patternLengthCm) + knots * knotLength + extra };
  });

  const pieces: NormalPiece[] = [];
  for (let i = 0; i < strings.length; i++) {
    const a = strings[i];
    const b = strings[i + 1];
    if (s.startMethod === "loop" && b && b.colorId === a.colorId) {
      pieces.push({ labels: [a.label, b.label], colorId: a.colorId, cutCm: a.cutCm + b.cutCm });
      i++;
    } else pieces.push({ labels: [a.label], colorId: a.colorId, cutCm: a.cutCm });
  }

  const totalsMap = new Map<string, number>();
  for (const x of strings) totalsMap.set(x.colorId, (totalsMap.get(x.colorId) ?? 0) + x.cutCm);
  const totals = [...totalsMap.entries()]
    .map(([id, cm]) => ({ colorId: id, name: getThread(id).name, hex: getThread(id).hex, cm }))
    .sort((a, b) => b.cm - a.cm);

  const folded = pieces.filter((x) => x.labels.length === 2).length;
  const longest = formatLength(Math.max(...pieces.map((x) => x.cutCm)), s.unit);
  const note =
    folded > 0
      ? `Cut ${pieces.length} pieces (longest ${longest}) and fold ${folded === pieces.length ? "each" : folded} in half at the loop for ${strings.length} strings.`
      : `Cut ${strings.length} strings, the longest at ${longest}.`;

  return { strings, pieces, totals, repeats, patternLengthCm, finishedLengthCm, isCustomLength, knotLengthCm: knotLength, note };
}
