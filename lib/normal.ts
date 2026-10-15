// Traditional ("normal") friendship bracelet patterns.
//
// Strings hang side by side. Rows alternate: even rows (0, 2, ...) tie strings 1+2, 3+4, ...,
// odd rows tie 2+3, 4+5, ... Each knot is one of four types:
//   f  forward            left string ties over the right: shows the left colour, strings swap
//   b  backward           right string ties over the left: shows the right colour, strings swap
//   fb forward-backward   shows the left colour, strings stay put
//   bf backward-forward   shows the right colour, strings stay put
//
// The pattern stores only the string colours and the knot types. Knot colours are always
// worked out by simulating the strings, so every pattern can actually be tied.

export type Knot = "f" | "b" | "fb" | "bf";
export const KNOTS: Knot[] = ["f", "b", "fb", "bf"];

export type NormalPattern = {
  strings: string[]; // colour of each string, left to right, at the top
  knots: Knot[][]; // knots[row][i]
};

export const MIN_STRINGS = 4;
export const MAX_STRINGS = 20;
export const MIN_ROWS = 2;
export const MAX_ROWS = 80;

export const KNOT_INFO: Record<Knot, { name: string; short: string; showsLeft: boolean; swaps: boolean }> = {
  f: { name: "Forward", short: "F", showsLeft: true, swaps: true },
  b: { name: "Backward", short: "B", showsLeft: false, swaps: true },
  fb: { name: "Forward-backward", short: "FB", showsLeft: true, swaps: false },
  bf: { name: "Backward-forward", short: "BF", showsLeft: false, swaps: false },
};

/** First string tied in a row (0-based). */
export const rowStart = (r: number) => r % 2;

/** How many knots a row has with n strings. */
export const knotsInRow = (r: number, n: number) => Math.floor((n - rowStart(r)) / 2);

/** Left string position of knot i in row r. */
export const knotLeft = (r: number, i: number) => rowStart(r) + 2 * i;

export function knotFor(showsLeft: boolean, swaps: boolean): Knot {
  return showsLeft ? (swaps ? "f" : "fb") : swaps ? "b" : "bf";
}

export type Simulation = {
  /** order[r][p] = which original string sits at position p just before row r (order[rows] = the end). */
  order: number[][];
  /** Colour shown by each knot. */
  colors: string[][];
  /** Original string that ties each knot (the one whose colour shows). */
  tiedBy: number[][];
  /** Knots each original string ties. */
  tiedCount: number[];
  /** True when the strings end in the same colour order they started in, so the pattern repeats cleanly. */
  repeats: boolean;
};

export function simulate(p: NormalPattern): Simulation {
  const n = p.strings.length;
  let pos = Array.from({ length: n }, (_, i) => i);
  const order: number[][] = [];
  const colors: string[][] = [];
  const tiedBy: number[][] = [];
  const tiedCount = new Array<number>(n).fill(0);
  p.knots.forEach((row, r) => {
    order.push(pos);
    const next = pos.slice();
    const rowColors: string[] = [];
    const rowTied: number[] = [];
    for (let i = 0; i < knotsInRow(r, n); i++) {
      const L = knotLeft(r, i);
      const k = row[i] ?? "f";
      const info = KNOT_INFO[k];
      const s = info.showsLeft ? pos[L] : pos[L + 1];
      rowColors.push(p.strings[s]);
      rowTied.push(s);
      tiedCount[s]++;
      if (info.swaps) [next[L], next[L + 1]] = [pos[L + 1], pos[L]];
    }
    colors.push(rowColors);
    tiedBy.push(rowTied);
    pos = next;
  });
  order.push(pos);
  const repeats = pos.every((s, i) => p.strings[s] === p.strings[i]);
  return { order, colors, tiedBy, tiedCount, repeats };
}

/** Make sure a pattern has the right shape (used for drafts and anything loaded from storage). */
export function normalizePattern(p: NormalPattern): NormalPattern {
  const n = Math.max(MIN_STRINGS, Math.min(MAX_STRINGS, p.strings.length));
  const strings = Array.from({ length: n }, (_, i) => p.strings[i] ?? p.strings[p.strings.length - 1] ?? "white");
  let rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, p.knots.length));
  if (rows % 2) rows++;
  const knots = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: knotsInRow(r, n) }, (_, i) => (KNOTS.includes(p.knots[r]?.[i]) ? p.knots[r][i] : "f")),
  );
  return { strings, knots };
}

export function isNormalPattern(x: unknown): x is NormalPattern {
  const p = x as NormalPattern | null;
  return !!p && Array.isArray(p.strings) && p.strings.every((s) => typeof s === "string") && Array.isArray(p.knots) && p.knots.every(Array.isArray);
}

// ---------- editing ----------

export function setKnot(p: NormalPattern, r: number, i: number, k: Knot): NormalPattern {
  if (p.knots[r]?.[i] === undefined || p.knots[r][i] === k) return p;
  const knots = p.knots.slice();
  knots[r] = knots[r].slice();
  knots[r][i] = k;
  return { ...p, knots };
}

export function nextKnot(k: Knot): Knot {
  return KNOTS[(KNOTS.indexOf(k) + 1) % KNOTS.length];
}

/**
 * Make a knot show the given colour, if either string meeting there has it.
 * Keeps whether the strings swap, so the rest of the pattern moves as little as possible.
 */
export function paintKnot(p: NormalPattern, r: number, i: number, color: string): { pattern: NormalPattern; options?: [string, string] } {
  const sim = simulate(p);
  const L = knotLeft(r, i);
  const left = p.strings[sim.order[r][L]];
  const right = p.strings[sim.order[r][L + 1]];
  const current = p.knots[r][i];
  if (sim.colors[r][i] === color) return { pattern: p };
  if (left !== color && right !== color) return { pattern: p, options: [left, right] };
  return { pattern: setKnot(p, r, i, knotFor(left === color, KNOT_INFO[current].swaps)) };
}

export function setString(p: NormalPattern, s: number, color: string): NormalPattern {
  if (p.strings[s] === color) return p;
  const strings = p.strings.slice();
  strings[s] = color;
  return { ...p, strings };
}

/** Add or remove strings on the right, and rows at the bottom. New knots are forward knots. */
export function resizeNormal(p: NormalPattern, strings: number, rows: number): NormalPattern {
  const n = Math.max(MIN_STRINGS, Math.min(MAX_STRINGS, Math.round(strings)));
  let r = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.round(rows)));
  if (r % 2) r++;
  const s = Array.from({ length: n }, (_, i) => p.strings[i] ?? p.strings[p.strings.length - 1]);
  return normalizePattern({ strings: s, knots: Array.from({ length: r }, (_, row) => p.knots[row] ?? []) });
}

/**
 * Flip left ↔ right: strings reverse and forward/backward knots swap.
 * With an odd number of strings the row layout flips too, so rows shift by one to keep the shape.
 */
export function mirrorNormal(p: NormalPattern): NormalPattern {
  const n = p.strings.length;
  const rows = p.knots.length;
  const mirrorRow = (r: number) => p.knots[r].map((k) => FLIP_KNOT[k]).reverse();
  if (n % 2 === 0) return { strings: p.strings.slice().reverse(), knots: p.knots.map((_, r) => mirrorRow(r)) };
  // Odd: start from the strings as they sit before the last row, then rotate rows down by one.
  const sim = simulate(p);
  const before = sim.order[rows - 1].map((s) => p.strings[s]).reverse();
  const knots = p.knots.map((_, r) => mirrorRow((r + rows - 1) % rows));
  return { strings: before, knots };
}

// ---------- classic styles ----------

export const NORMAL_STYLES = [
  "chevron",
  "arrowhead",
  "diagonal",
  "zigzag",
  "diamond",
  "double-chevron",
  "criss-cross",
  "lightning",
  "checker",
  "ripple",
] as const;
export type NormalStyle = (typeof NORMAL_STYLES)[number];

/**
 * How colours are laid across the strings:
 * mirrored  A B C C B A            (each colour once per side)
 * blocks    A A B B C C            (left to right)
 * double    A B B A A B B A        (two mirrored halves, for two chevrons side by side)
 * pairs     A A B B A A B B        (repeating pairs, for checks and ripples)
 */
type Layout = "mirrored" | "blocks" | "double" | "pairs";

export const STYLE_INFO: Record<NormalStyle, { name: string; hint: string; layout: Layout; minStrings: number; maxColors?: number }> = {
  chevron: { name: "Chevron", hint: "Classic V stripes", layout: "mirrored", minStrings: 4 },
  arrowhead: { name: "Arrowhead", hint: "Upside-down V stripes", layout: "mirrored", minStrings: 4 },
  diagonal: { name: "Candy stripe", hint: "Diagonal stripes", layout: "blocks", minStrings: 4 },
  zigzag: { name: "Zigzag", hint: "Wavy stripes from edge to edge", layout: "mirrored", minStrings: 4 },
  diamond: { name: "Diamonds", hint: "Chevrons and arrowheads together", layout: "mirrored", minStrings: 4 },
  "double-chevron": { name: "Double chevron", hint: "Two chevrons side by side", layout: "double", minStrings: 8 },
  "criss-cross": { name: "Criss-cross", hint: "Big X's with diamonds between", layout: "mirrored", minStrings: 8, maxColors: 3 },
  lightning: { name: "Lightning", hint: "Zigzag with a long and a short side", layout: "mirrored", minStrings: 4 },
  checker: { name: "Checkerboard", hint: "Little checks, no string moves", layout: "pairs", minStrings: 4 },
  ripple: { name: "Ripple", hint: "Wiggly stripes along the bracelet", layout: "pairs", minStrings: 4 },
};

export const FLIP_KNOT: Record<Knot, Knot> = { f: "b", b: "f", fb: "bf", bf: "fb" };

/** V between strings lo and hi: strings move toward the middle. */
function veeIn(L: number, lo: number, hi: number): Knot {
  const c = (lo + hi) / 2;
  return L + 1 < c ? "f" : L >= c ? "b" : "f";
}

/** Upside-down V: strings move out from the middle. */
function peakIn(L: number, lo: number, hi: number): Knot {
  const c = (lo + hi) / 2;
  return L + 1 < c ? "b" : "f";
}

/**
 * A zigzag leg: `out` forward rows, a forward-backward turn, `back` backward rows, a backward-forward turn.
 * Forward and backward knots move strings the same way and only change which colour shows,
 * so stripes need the turn rows to change direction.
 */
function zig(r: number, out: number, back: number): Knot {
  const c = r % (out + back + 2);
  return c < out ? "f" : c === out ? "fb" : c <= out + back ? "b" : "bf";
}

const lightningShort = (p: number) => Math.max(1, Math.floor(p / 2));

type Rule = { phases: (n: number) => number[]; cycle: (phase: number) => number; knot: (r: number, L: number, n: number, phase: number) => Knot };

const simple = (knot: (r: number, L: number, n: number) => Knot, cycle = 1): Rule => ({ phases: () => [1], cycle: () => cycle, knot });

const RULES: Record<NormalStyle, Rule> = {
  chevron: simple((_, L, n) => veeIn(L, 0, n)),
  arrowhead: simple((_, L, n) => peakIn(L, 0, n)),
  diagonal: simple(() => "f"),
  // Stripes run one string short of the full width before turning, which always repeats in 2n rows.
  zigzag: { phases: (n) => [n - 1], cycle: (p) => p * 2 + 2, knot: (r, _, __, p) => zig(r, p, p) },
  diamond: {
    phases: (n) => [n / 2, n, n - 2, n + 2].map((x) => Math.max(2, Math.round(x / 2) * 2)),
    cycle: (p) => p * 2,
    knot: (r, L, n, p) => (Math.floor(r / p) % 2 ? peakIn(L, 0, n) : veeIn(L, 0, n)),
  },
  "double-chevron": simple((_, L, n) => {
    const h = n / 2;
    if (L + 1 === h) return "f";
    return L < h ? veeIn(L, 0, h) : veeIn(L, h, n);
  }),
  // Two zigzags facing each other cross in the middle, making X's with diamonds between them.
  "criss-cross": {
    phases: (n) => [n / 2 - 1],
    cycle: (p) => p * 2 + 2,
    knot: (r, L, n, p) => (L + 1 < n / 2 ? zig(r, p, p) : L >= n / 2 ? FLIP_KNOT[zig(r, p, p)] : "f"),
  },
  lightning: { phases: (n) => [n - 1], cycle: (p) => p + lightningShort(p) + 2, knot: (r, _, __, p) => zig(r, p, lightningShort(p)) },
  // Strings never move: even rows tie matching pairs, odd rows pick which neighbour shows.
  checker: simple((r, L) => (r % 2 === 0 ? "fb" : (Math.floor(r / 2) + Math.floor(L / 2)) % 2 ? "fb" : "bf"), 4),
  ripple: simple((r) => (r % 2 === 0 ? "fb" : Math.floor(r / 2) % 2 ? "fb" : "bf"), 4),
};

/** Spread colours over k strings in blocks, in order. */
function blocks(colors: string[], k: number): string[] {
  const c = colors.slice(0, k);
  return Array.from({ length: k }, (_, s) => c[Math.floor((s * c.length) / k)]);
}

/** How many colours a style can show on n strings. */
export function colorRoom(style: NormalStyle, n: number): number {
  const info = STYLE_INFO[style];
  const room = { mirrored: n / 2, blocks: n, double: n / 4, pairs: n / 2 }[info.layout];
  return Math.max(1, Math.min(room, info.maxColors ?? MAX_STRINGS));
}

/** A string count that suits the style: even, at least its minimum, and a multiple of 4 for double chevrons. */
export function fitStrings(style: NormalStyle, strings: number, max = MAX_STRINGS): number {
  const step = STYLE_INFO[style].layout === "double" ? 4 : 2;
  let n = Math.max(MIN_STRINGS, STYLE_INFO[style].minStrings, Math.round(strings));
  n = Math.ceil(n / step) * step;
  while (n > max) n -= step;
  return n;
}

/** A good number of strings for a style and number of colours, so the stripes are wide enough to see. */
export function suggestedStrings(style: NormalStyle, colors: number): number {
  const perColor = { mirrored: 2, blocks: 2, double: 4, pairs: 2 }[STYLE_INFO[style].layout];
  const min = style === "criss-cross" ? 12 : style === "double-chevron" ? 12 : 8;
  return fitStrings(style, Math.max(min, colors * perColor));
}

/** Lay out string colours for a style. */
export function stringsForStyle(style: NormalStyle, colors: string[], n: number): string[] {
  const cs = (colors.length ? colors : ["white"]).slice(0, colorRoom(style, n));
  switch (STYLE_INFO[style].layout) {
    case "blocks":
      return blocks(cs, n);
    case "pairs":
      return Array.from({ length: n }, (_, s) => cs[Math.floor(s / 2) % cs.length]);
    case "mirrored": {
      const half = blocks(cs, n / 2);
      return [...half, ...half.slice().reverse()];
    }
    case "double": {
      const q = blocks(cs, n / 4);
      const half = [...q, ...q.slice().reverse()];
      return [...half, ...half];
    }
  }
}

/**
 * Add a border string down each side. The edge strings stay put (forward-backward on the left,
 * backward-forward on the right) and the inner pattern shifts by one row so its knots line up.
 */
export function withBorder(inner: NormalPattern, color: string): NormalPattern {
  const n = inner.strings.length + 2;
  const rows = inner.knots.length;
  const sim = simulate(inner);
  // Global row 0 lines up with inner row 1, so start from the strings as they sit before it.
  const start = sim.order[1 % rows].map((s) => inner.strings[s]);
  const knots = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: knotsInRow(r, n) }, (_, i): Knot => {
      const L = knotLeft(r, i);
      if (L === 0) return "fb";
      if (L === n - 2) return "bf";
      const q = (r + 1) % rows;
      return inner.knots[q][(L - 1 - rowStart(q)) / 2];
    }),
  );
  return { strings: [color, ...start, color], knots };
}

/** Build a style, picking the shortest number of rows that repeats cleanly. Pass a colour to add a border. */
export function buildStyle(style: NormalStyle, colors: string[], strings: number, border?: string): NormalPattern {
  if (border) return withBorder(buildStyle(style, colors, fitStrings(style, strings - 2, MAX_STRINGS - 2)), border);
  const n = fitStrings(style, strings);
  const s = stringsForStyle(style, colors, n);
  const rule = RULES[style];
  let fallback: NormalPattern | null = null;
  for (const phase of rule.phases(n)) {
    const cycle = rule.cycle(phase);
    for (let rows = 2; rows <= MAX_ROWS; rows += 2) {
      // Styles that change direction should show every part of their cycle.
      if (rows < cycle || rows % cycle) continue;
      const p: NormalPattern = {
        strings: s,
        knots: Array.from({ length: rows }, (_, r) => Array.from({ length: knotsInRow(r, n) }, (_, i) => rule.knot(r, knotLeft(r, i), n, phase))),
      };
      if (simulate(p).repeats) return p;
      fallback ??= p;
    }
  }
  return fallback!;
}
