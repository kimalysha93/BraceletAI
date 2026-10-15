import type { NormalPattern } from "./normal";

export type ThreadColor = { id: string; name: string; hex: string };

export type PatternSource = "manual" | "motif" | "text" | "ai" | "photo" | "remix";

export type AlphaPattern = {
  kind?: "alpha"; // older saved patterns have no kind and are alpha
  id: string;
  title: string;
  author: string; // free text, no accounts
  width: number; // columns (knots per row)
  height: number; // rows
  palette: ThreadColor[]; // colours used, max 8
  grid: string[][]; // grid[row][col] = ThreadColor.id
  tags: string[];
  remixedFrom?: string; // id of the original pattern, if remixed
  createdAt: string;
  source: PatternSource;
};

/** A traditional (diagonal knot) pattern in the library. width = strings, height = rows in one repeat. */
export type TraditionalPattern = Omit<AlphaPattern, "kind" | "grid"> & {
  kind: "normal";
  normal: NormalPattern;
};

export type LibraryPattern = AlphaPattern | TraditionalPattern;

export function isTraditional(p: LibraryPattern): p is TraditionalPattern {
  return p.kind === "normal";
}

/** The parts of a pattern the editor works on before it is published. */
export type Draft = Pick<AlphaPattern, "width" | "height" | "grid">;
