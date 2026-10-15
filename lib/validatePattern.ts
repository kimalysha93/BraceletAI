import { MAX_COLORS, MAX_HEIGHT, MAX_WIDTH, MIN_HEIGHT, MIN_WIDTH } from "./constants";
import { isValidGrid, paletteFor, usedColorIds } from "./grid";
import { KNOTS, knotsInRow, MAX_ROWS, MAX_STRINGS, MIN_ROWS, MIN_STRINGS, type NormalPattern } from "./normal";
import { getThread, isValidThread } from "./palette";
import type { LibraryPattern, PatternSource } from "./types";

const SOURCES: PatternSource[] = ["manual", "motif", "text", "ai", "photo", "remix"];

function cleanText(v: unknown, max: number, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const s = v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
  return s || fallback;
}

/** Validate an incoming pattern (from the browser) and fill in server-owned fields. */
export function validatePattern(body: unknown, makeId: () => string): { pattern: LibraryPattern } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing pattern." };
  const b = body as Record<string, unknown>;

  const tags = (Array.isArray(b.tags) ? b.tags : [])
    .map((t) => cleanText(t, 24, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  const common = {
    id: makeId(),
    title: cleanText(b.title, 60, "Untitled bracelet"),
    author: cleanText(b.author, 40, "Anonymous"),
    tags: [...new Set(tags)],
    remixedFrom: typeof b.remixedFrom === "string" ? b.remixedFrom.slice(0, 80) : undefined,
    createdAt: new Date().toISOString(),
    source: SOURCES.includes(b.source as PatternSource) ? (b.source as PatternSource) : "manual",
  };

  if (b.kind === "normal") {
    const n = validateNormal(b.normal);
    if ("error" in n) return n;
    const p = n.pattern;
    return {
      pattern: {
        ...common,
        kind: "normal",
        width: p.strings.length,
        height: p.knots.length,
        palette: [...new Set(p.strings)].map(getThread),
        normal: p,
      },
    };
  }

  const width = Number(b.width);
  const height = Number(b.height);
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) return { error: "Width is out of range." };
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) return { error: "Height is out of range." };
  if (!isValidGrid(b.grid, width, height)) return { error: "Pattern grid is invalid." };
  if (usedColorIds(b.grid).length > MAX_COLORS) return { error: `Patterns can use up to ${MAX_COLORS} colours.` };

  return { pattern: { ...common, kind: "alpha", width, height, palette: paletteFor(b.grid), grid: b.grid } };
}

/** Strings and knots must have exactly the shape the editor makes. */
function validateNormal(raw: unknown): { pattern: NormalPattern } | { error: string } {
  const p = raw as NormalPattern | null;
  if (!p || !Array.isArray(p.strings) || !Array.isArray(p.knots)) return { error: "Traditional pattern is missing." };
  const n = p.strings.length;
  const rows = p.knots.length;
  if (n < MIN_STRINGS || n > MAX_STRINGS) return { error: "Number of strings is out of range." };
  if (rows < MIN_ROWS || rows > MAX_ROWS || rows % 2) return { error: "Number of rows is out of range." };
  if (!p.strings.every(isValidThread)) return { error: "Unknown string colour." };
  if (new Set(p.strings).size > MAX_COLORS) return { error: `Patterns can use up to ${MAX_COLORS} colours.` };
  const shapeOk = p.knots.every((row, r) => Array.isArray(row) && row.length === knotsInRow(r, n) && row.every((k) => KNOTS.includes(k)));
  if (!shapeOk) return { error: "Knots are invalid." };
  return { pattern: { strings: [...p.strings], knots: p.knots.map((row) => [...row]) } };
}

export function makePatternId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug || "pattern"}-${rand}`;
}
