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
  const flip: Record<Knot, Knot> = { f: "b", b: "f", fb: "bf", bf: "fb" };
  const mirrorRow = (r: number) => p.knots[r].map((k) => flip[k]).reverse();
  if (n % 2 === 0) return { strings: p.strings.slice().reverse(), knots: p.knots.map((_, r) => mirrorRow(r)) };
  // Odd: start from the strings as they sit before the last row, then rotate rows down by one.
  const sim = simulate(p);
  const before = sim.order[rows - 1].map((s) => p.strings[s]).reverse();
  const knots = p.knots.map((_, r) => mirrorRow((r + rows - 1) % rows));
  return { strings: before, knots };
}

// ---------- classic styles ----------

export const NORMAL_STYLES = ["chevron", "arrowhead", "diagonal", "zigzag", "diamond"] as const;
export type NormalStyle = (typeof NORMAL_STYLES)[number];

export const STYLE_INFO: Record<NormalStyle, { name: string; hint: string; mirrored: boolean }> = {
  chevron: { name: "Chevron", hint: "Classic V stripes", mirrored: true },
  arrowhead: { name: "Arrowhead", hint: "Upside-down V stripes", mirrored: true },
  diagonal: { name: "Candy stripe", hint: "Diagonal stripes", mirrored: false },
  zigzag: { name: "Zigzag", hint: "Stripes that switch direction", mirrored: false },
  diamond: { name: "Diamonds", hint: "Chevrons and arrowheads together", mirrored: true },
};

/** Knot type for a style at row r, knot i, given n strings and the length of one phase. */
function styleKnot(style: NormalStyle, r: number, i: number, n: number, phase: number): Knot {
  const L = knotLeft(r, i);
  const centre = n / 2; // chevrons always have an even number of strings
  const vee = L + 1 < centre ? "f" : L >= centre ? "b" : "f";
  const peak = L + 1 < centre ? "b" : L >= centre ? "f" : "f";
  switch (style) {
    case "diagonal":
      return "f";
    case "zigzag":
      return Math.floor(r / phase) % 2 ? "b" : "f";
    case "chevron":
      return vee;
    case "arrowhead":
      return peak;
    case "diamond":
      return Math.floor(r / phase) % 2 ? peak : vee;
  }
}

/** Spread colours over k strings in blocks, in order. */
function blocks(colors: string[], k: number): string[] {
  const c = colors.slice(0, k);
  return Array.from({ length: k }, (_, s) => c[Math.floor((s * c.length) / k)]);
}

/** Lay out string colours for a style: mirrored styles repeat the colours back from the middle. */
export function stringsForStyle(style: NormalStyle, colors: string[], n: number): string[] {
  const cs = colors.length ? colors : ["white"];
  if (!STYLE_INFO[style].mirrored) return blocks(cs, n);
  const half = blocks(cs, n / 2);
  return [...half, ...half.slice().reverse()];
}

/** Build a style, picking the shortest number of rows that repeats cleanly. */
export function buildStyle(style: NormalStyle, colors: string[], strings: number): NormalPattern {
  let n = Math.max(MIN_STRINGS, Math.min(MAX_STRINGS, Math.round(strings)));
  // Even string counts keep the classic shapes short and symmetric.
  if (n % 2) n++;
  if (n > MAX_STRINGS) n -= 2;
  const s = stringsForStyle(style, colors, n);
  const phases = style === "zigzag" || style === "diamond" ? [n / 2, n, n - 2, n + 2].map((x) => Math.max(2, Math.round(x / 2) * 2)) : [1];
  let fallback: NormalPattern | null = null;
  for (const phase of phases) {
    for (let rows = 2; rows <= MAX_ROWS; rows += 2) {
      // Compound styles should show both directions at least once.
      if (phase > 1 && rows < phase * 2) continue;
      const p: NormalPattern = {
        strings: s,
        knots: Array.from({ length: rows }, (_, r) => Array.from({ length: knotsInRow(r, n) }, (_, i) => styleKnot(style, r, i, n, phase))),
      };
      if (simulate(p).repeats && (phase === 1 || rows % (phase * 2) === 0)) return p;
      if (!fallback && rows === Math.min(MAX_ROWS, Math.max(phase * 2, n * 2))) fallback = p;
    }
  }
  return fallback!;
}
