export type ThreadColor = { id: string; name: string; hex: string };

export type PatternSource = "manual" | "motif" | "text" | "ai" | "photo" | "remix";

export type AlphaPattern = {
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

/** The parts of a pattern the editor works on before it is published. */
export type Draft = Pick<AlphaPattern, "width" | "height" | "grid">;
