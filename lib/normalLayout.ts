import { knotLeft, knotsInRow, type Knot, type NormalPattern, type Simulation } from "./normal";

// Geometry shared by the on-screen diagram and the PNG export, so they always match.

export type KnotSpot = { r: number; i: number; cx: number; cy: number; color: string; knot: Knot };
export type Segment = { color: string; points: [number, number][] };

/**
 * Strings hang `cell` apart; each row is `cell` tall. A knot sits halfway between its two strings,
 * so knots in neighbouring rows interlock like the real thing.
 */
export function normalLayout(p: NormalPattern, sim: Simulation, cell: number, left: number, top: number) {
  const n = p.strings.length;
  const rows = p.knots.length;
  const x = (pos: number) => left + pos * cell + cell / 2;
  const knots: KnotSpot[] = [];
  const segments: Segment[] = [];

  for (let r = 0; r < rows; r++) {
    const y0 = top + r * cell;
    const y1 = y0 + cell;
    const cy = y0 + cell / 2;
    const before = sim.order[r];
    const after = sim.order[r + 1];
    const centreOf = new Map<number, number>(); // position -> knot centre x
    for (let i = 0; i < knotsInRow(r, n); i++) {
      const L = knotLeft(r, i);
      const cx = left + (L + 1) * cell;
      centreOf.set(L, cx);
      centreOf.set(L + 1, cx);
      knots.push({ r, i, cx, cy, color: sim.colors[r][i], knot: p.knots[r][i] });
    }
    for (let q = 0; q < n; q++) {
      const s = before[q];
      const q2 = after.indexOf(s);
      const cx = centreOf.get(q);
      segments.push({
        color: p.strings[s],
        points: cx == null ? [[x(q), y0], [x(q), y1]] : [[x(q), y0], [cx, cy], [x(q2), y1]],
      });
    }
  }
  return { knots, segments, x, width: n * cell, height: rows * cell };
}

/** Arrow drawn on a knot: ↘ forward, ↙ backward, > forward-backward, < backward-forward. */
export function knotArrow(k: Knot, cx: number, cy: number, size: number) {
  const a = size;
  const pts: [number, number][] =
    k === "f"
      ? [[cx - a, cy - a], [cx + a, cy + a]]
      : k === "b"
        ? [[cx + a, cy - a], [cx - a, cy + a]]
        : k === "fb"
          ? [[cx - a * 0.6, cy - a], [cx + a * 0.6, cy], [cx - a * 0.6, cy + a]]
          : [[cx + a * 0.6, cy - a], [cx - a * 0.6, cy], [cx + a * 0.6, cy + a]];
  const [ex, ey] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 2];
  const len = Math.hypot(ex - px, ey - py) || 1;
  const ux = (ex - px) / len;
  const uy = (ey - py) / len;
  const h = size * 0.75;
  const head = `M${ex},${ey} L${ex - ux * h - uy * h * 0.6},${ey - uy * h + ux * h * 0.6} L${ex - ux * h + uy * h * 0.6},${ey - uy * h - ux * h * 0.6} Z`;
  // Stop the line where the head starts so the tip stays sharp.
  const shaft = pts.map(([x, y], j) => (j === pts.length - 1 ? [ex - ux * h * 0.8, ey - uy * h * 0.8] : [x, y]));
  return { line: `M${shaft.map(([x, y]) => `${x},${y}`).join(" L")}`, head };
}

/** Knots as diamonds for the worn (horizontal) preview, repeated to fill `targetRows`. */
export function braceletDiamonds(p: NormalPattern, sim: Simulation, w: number, h: number, targetRows: number) {
  const n = p.strings.length;
  const rows = p.knots.length;
  const copies = Math.max(1, Math.ceil(targetRows / rows));
  const out: { x: number; y: number; color: string }[] = [];
  for (let c = 0; c < copies; c++) {
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < knotsInRow(r, n); i++) {
        out.push({ x: (c * rows + r) * w + w, y: (knotLeft(r, i) + 1) * h, color: sim.colors[r][i] });
      }
    }
  }
  return { diamonds: out, width: (copies * rows + 1) * w, height: n * h };
}
