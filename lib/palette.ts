import type { ThreadColor } from "./types";

// Plain colour names only (no thread brands or numbers).
export const THREADS: ThreadColor[] = [
  { id: "red", name: "red", hex: "#E2463F" },
  { id: "coral", name: "coral", hex: "#FF7B6B" },
  { id: "orange", name: "orange", hex: "#FF9A3C" },
  { id: "peach", name: "peach", hex: "#FFC9A8" },
  { id: "yellow", name: "yellow", hex: "#FFD84D" },
  { id: "lime", name: "lime", hex: "#B9E05A" },
  { id: "mint", name: "mint", hex: "#A8E6CF" },
  { id: "green", name: "green", hex: "#3FAF6A" },
  { id: "dark-green", name: "dark green", hex: "#2E6B47" },
  { id: "teal", name: "teal", hex: "#2BB3A8" },
  { id: "sky-blue", name: "sky blue", hex: "#7CC8F2" },
  { id: "blue", name: "blue", hex: "#3D7DD8" },
  { id: "navy", name: "navy", hex: "#253A6B" },
  { id: "lavender", name: "lavender", hex: "#C7B8F5" },
  { id: "purple", name: "purple", hex: "#8A5CD1" },
  { id: "pink", name: "pink", hex: "#FFB3CF" },
  { id: "hot-pink", name: "hot pink", hex: "#F0509A" },
  { id: "burgundy", name: "burgundy", hex: "#8E2F4A" },
  { id: "white", name: "white", hex: "#FFFFFF" },
  { id: "cream", name: "cream", hex: "#FFF4DC" },
  { id: "beige", name: "beige", hex: "#E3CBA8" },
  { id: "brown", name: "brown", hex: "#8B5A3C" },
  { id: "grey", name: "grey", hex: "#A5A3AD" },
  { id: "black", name: "black", hex: "#2B2730" },
];

export const THREAD_BY_ID: Record<string, ThreadColor> = Object.fromEntries(
  THREADS.map((t) => [t.id, t]),
);

export const THREAD_NAMES = THREADS.map((t) => t.name);

export function isValidThread(id: unknown): id is string {
  return typeof id === "string" && !!THREAD_BY_ID[id];
}

export function getThread(id: string): ThreadColor {
  return THREAD_BY_ID[id] ?? THREAD_BY_ID.white;
}

// Everyday words people use that aren't exact palette names.
const SYNONYMS: Record<string, string> = {
  rose: "pink",
  "baby pink": "pink",
  "light pink": "pink",
  blush: "pink",
  magenta: "hot-pink",
  fuchsia: "hot-pink",
  violet: "purple",
  lilac: "lavender",
  aqua: "teal",
  turquoise: "teal",
  cyan: "sky-blue",
  "light blue": "sky-blue",
  "baby blue": "sky-blue",
  "dark blue": "navy",
  "royal blue": "blue",
  gold: "yellow",
  golden: "yellow",
  lemon: "yellow",
  salmon: "coral",
  tan: "beige",
  ivory: "cream",
  gray: "grey",
  silver: "grey",
  maroon: "burgundy",
  wine: "burgundy",
  olive: "dark-green",
  forest: "dark-green",
  "forest green": "dark-green",
  "light green": "lime",
  "sage": "mint",
  "seafoam": "mint",
  chocolate: "brown",
};

/** Map any colour name (or hex) to the closest palette thread id. */
export function resolveColor(input: string | undefined | null, fallback = "white"): string {
  if (!input) return fallback;
  const raw = input.trim().toLowerCase();
  if (!raw) return fallback;
  if (/^#?[0-9a-f]{6}$/.test(raw)) return nearestThreadId(raw.startsWith("#") ? raw : `#${raw}`);
  const dashed = raw.replace(/\s+/g, "-");
  if (THREAD_BY_ID[dashed]) return dashed;
  const spaced = raw.replace(/[-_]+/g, " ");
  if (SYNONYMS[spaced]) return SYNONYMS[spaced];
  const exact = THREADS.find((t) => t.name === spaced);
  if (exact) return exact.id;
  // Partial match: "pastel pink" -> pink, "dark navy blue" -> navy
  const byName = [...THREADS].sort((a, b) => b.name.length - a.name.length).find((t) => spaced.includes(t.name));
  if (byName) return byName.id;
  const bySyn = Object.keys(SYNONYMS)
    .sort((a, b) => b.length - a.length)
    .find((k) => spaced.includes(k));
  if (bySyn) return SYNONYMS[bySyn];
  return fallback;
}

/** Words the keyword parser should look for, longest first ("hot pink" before "pink"). */
export const COLOR_WORDS: { word: string; id: string }[] = [
  ...THREADS.map((t) => ({ word: t.name, id: t.id })),
  ...Object.entries(SYNONYMS).map(([word, id]) => ({ word, id })),
].sort((a, b) => b.word.length - a.word.length);

// ---------- colour maths ----------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const THREAD_LABS = THREADS.map((t) => ({ id: t.id, lab: rgbToLab(hexToRgb(t.hex)) }));

export function labDistance(a: [number, number, number], b: [number, number, number]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export function nearestThreadIdRgb(rgb: [number, number, number], allowed?: string[]): string {
  const lab = rgbToLab(rgb);
  let best = "white";
  let bestD = Infinity;
  for (const t of THREAD_LABS) {
    if (allowed && !allowed.includes(t.id)) continue;
    const d = labDistance(lab, t.lab);
    if (d < bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}

export function nearestThreadId(hex: string): string {
  return nearestThreadIdRgb(hexToRgb(hex));
}

/** Relative luminance 0..1 */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(aId: string, bId: string): number {
  const a = luminance(getThread(aId).hex);
  const b = luminance(getThread(bId).hex);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** A readable partner colour for text/motifs on the given background. */
export function contrastingThread(bgId: string): string {
  return luminance(getThread(bgId).hex) > 0.45 ? "navy" : "white";
}
