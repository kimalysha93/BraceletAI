import type { ThreadColor } from "./types";
import { getThread, THREAD_BY_ID } from "./palette";

export type Grid = string[][];

export function createGrid(width: number, height: number, fill: string): Grid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

/** Counts per colour, most-used first. */
export function countColors(grid: Grid): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of grid) for (const id of row) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export function usedColorIds(grid: Grid): string[] {
  return countColors(grid).map((c) => c.id);
}

export function paletteFor(grid: Grid): ThreadColor[] {
  return usedColorIds(grid).map(getThread);
}

export function mostCommonColor(grid: Grid, fallback = "white"): string {
  return countColors(grid)[0]?.id ?? fallback;
}

/** Returns a new grid with the given cells set; untouched rows keep their identity (cheap re-renders). */
export function setCells(grid: Grid, cells: [number, number][], color: string): Grid {
  let next: Grid | null = null;
  const copied = new Set<number>();
  for (const [r, c] of cells) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) continue;
    if ((next ?? grid)[r][c] === color) continue;
    if (!next) next = grid.slice();
    if (!copied.has(r)) {
      next[r] = next[r].slice();
      copied.add(r);
    }
    next[r][c] = color;
  }
  return next ?? grid;
}

export function floodFill(grid: Grid, r: number, c: number, color: string): Grid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (r < 0 || r >= h || c < 0 || c >= w) return grid;
  const target = grid[r][c];
  if (target === color) return grid;
  const cells: [number, number][] = [];
  const seen = new Uint8Array(w * h);
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [y, x] = stack.pop()!;
    if (y < 0 || y >= h || x < 0 || x >= w) continue;
    const i = y * w + x;
    if (seen[i] || grid[y][x] !== target) continue;
    seen[i] = 1;
    cells.push([y, x]);
    stack.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);
  }
  return setCells(grid, cells, color);
}

export function replaceColor(grid: Grid, from: string, to: string): Grid {
  if (from === to) return grid;
  return grid.map((row) => (row.includes(from) ? row.map((id) => (id === from ? to : id)) : row));
}

/** Resize, keeping existing cells. Width changes stay centred so designs don't drift to one side. */
export function resizeGrid(grid: Grid, width: number, height: number, bg: string): Grid {
  const oldW = grid[0]?.length ?? 0;
  const offset = Math.floor((width - oldW) / 2);
  return Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const src = grid[r]?.[c - offset];
      return src ?? bg;
    }),
  );
}

/** Flip left ↔ right (each row reversed). */
export function mirrorGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice().reverse());
}

// ---------- rectangular selections ----------

/** Inclusive cell rectangle. */
export type Rect = { r0: number; c0: number; r1: number; c1: number };

export function rectFrom(r: number, c: number, r2: number, c2: number): Rect {
  return { r0: Math.min(r, r2), c0: Math.min(c, c2), r1: Math.max(r, r2), c1: Math.max(c, c2) };
}

export function inRect(rect: Rect, r: number, c: number) {
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
}

export function rectCells(rect: Rect): [number, number][] {
  const out: [number, number][] = [];
  for (let r = rect.r0; r <= rect.r1; r++) for (let c = rect.c0; c <= rect.c1; c++) out.push([r, c]);
  return out;
}

export function copyRect(grid: Grid, rect: Rect): Grid {
  return grid.slice(rect.r0, rect.r1 + 1).map((row) => row.slice(rect.c0, rect.c1 + 1));
}

/** Stamp a patch with its top-left at (r, c); parts falling off the pattern are dropped. */
export function pastePatch(grid: Grid, patch: Grid, r: number, c: number): Grid {
  let next = grid;
  patch.forEach((row, dr) => row.forEach((id, dc) => (next = setCells(next, [[r + dr, c + dc]], id))));
  return next;
}

export function isValidGrid(grid: unknown, width: number, height: number): grid is Grid {
  return (
    Array.isArray(grid) &&
    grid.length === height &&
    grid.every(
      (row) => Array.isArray(row) && row.length === width && row.every((id) => typeof id === "string" && !!THREAD_BY_ID[id]),
    )
  );
}

// ---------- rotated stamping ----------
//
// Patterns run top-to-bottom, but people wear them sideways. Letters and motifs are
// stamped rotated 90° clockwise so they read upright in the horizontal bracelet preview
// (the same convention used by alpha pattern sites).
//
// A bitmap is an array of strings: '#' = main colour, '+' = detail colour, anything else = skip.

export type Bitmap = string[];

export function bitmapSize(bitmap: Bitmap) {
  return { w: Math.max(...bitmap.map((r) => r.length)), h: bitmap.length };
}

/** Rows and columns a bitmap occupies once rotated onto the pattern. */
export function rotatedFootprint(bitmap: Bitmap) {
  const { w, h } = bitmapSize(bitmap);
  return { rows: w, cols: h };
}

/** Where each filled pixel of a bitmap lands once stamped (rotated, centred across the bracelet). */
export function rotatedCells(bitmap: Bitmap, startRow: number, width: number): { r: number; c: number; detail: boolean }[] {
  const { rows, cols } = rotatedFootprint(bitmap);
  const startCol = Math.floor((width - cols) / 2);
  const out: { r: number; c: number; detail: boolean }[] = [];
  for (let gy = 0; gy < bitmap.length; gy++) {
    for (let gx = 0; gx < rows; gx++) {
      const ch = bitmap[gy][gx];
      if (ch === "#" || ch === "+") out.push({ r: startRow + gx, c: startCol + (cols - 1 - gy), detail: ch === "+" });
    }
  }
  return out;
}

export function stampRotated(grid: Grid, bitmap: Bitmap, startRow: number, main: string, detail: string = main): Grid {
  const cells = rotatedCells(bitmap, startRow, grid[0]?.length ?? 0);
  const mainCells = cells.filter((x) => !x.detail).map((x): [number, number] => [x.r, x.c]);
  const detailCells = cells.filter((x) => x.detail).map((x): [number, number] => [x.r, x.c]);
  return setCells(setCells(grid, mainCells, main), detailCells, detail);
}

/** Cells touching the given ones (including diagonals), used to outline letters on busy backgrounds. */
export function outlineCells(cells: [number, number][], width: number, height: number, minCol = 0, maxCol = width - 1): [number, number][] {
  const filled = new Set(cells.map(([r, c]) => r * width + c));
  const out = new Map<number, [number, number]>();
  for (const [r, c] of cells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= height || cc < minCol || cc > maxCol) continue;
        const k = rr * width + cc;
        if (!filled.has(k)) out.set(k, [rr, cc]);
      }
    }
  }
  return [...out.values()];
}

/** Map a vertical-layout cell to its position in the horizontal (worn) preview. */
export function toHorizontal(r: number, c: number, width: number) {
  return { x: r, y: width - 1 - c };
}

export function fromHorizontal(x: number, y: number, width: number) {
  return { r: x, c: width - 1 - y };
}
