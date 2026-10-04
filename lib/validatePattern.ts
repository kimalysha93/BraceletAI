import { MAX_COLORS, MAX_HEIGHT, MAX_WIDTH, MIN_HEIGHT, MIN_WIDTH } from "./constants";
import { isValidGrid, paletteFor, usedColorIds } from "./grid";
import type { AlphaPattern, PatternSource } from "./types";

const SOURCES: PatternSource[] = ["manual", "motif", "text", "ai", "photo", "remix"];

function cleanText(v: unknown, max: number, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const s = v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
  return s || fallback;
}

/** Validate an incoming pattern (from the browser) and fill in server-owned fields. */
export function validatePattern(body: unknown, makeId: () => string): { pattern: AlphaPattern } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing pattern." };
  const b = body as Record<string, unknown>;
  const width = Number(b.width);
  const height = Number(b.height);
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) return { error: "Width is out of range." };
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) return { error: "Height is out of range." };
  if (!isValidGrid(b.grid, width, height)) return { error: "Pattern grid is invalid." };
  if (usedColorIds(b.grid).length > MAX_COLORS) return { error: `Patterns can use up to ${MAX_COLORS} colours.` };

  const tags = (Array.isArray(b.tags) ? b.tags : [])
    .map((t) => cleanText(t, 24, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    pattern: {
      id: makeId(),
      title: cleanText(b.title, 60, "Untitled bracelet"),
      author: cleanText(b.author, 40, "Anonymous"),
      width,
      height,
      palette: paletteFor(b.grid),
      grid: b.grid,
      tags: [...new Set(tags)],
      remixedFrom: typeof b.remixedFrom === "string" ? b.remixedFrom.slice(0, 80) : undefined,
      createdAt: new Date().toISOString(),
      source: SOURCES.includes(b.source as PatternSource) ? (b.source as PatternSource) : "manual",
    },
  };
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
