import { MAX_HEIGHT } from "./constants";
import { FONT_HEIGHT, glyphsFor, normalizeText } from "./font";
import { createGrid, mostCommonColor, rotatedFootprint, setCells, stampRotated, type Bitmap, type Grid } from "./grid";
import { MOTIF_IDS, MOTIFS, type MotifId } from "./motifs";
import { contrastRatio, contrastingThread, resolveColor, THREAD_NAMES } from "./palette";

export type MotifPlacement = "ends" | "between_letters" | "repeat" | "none";
export type Border = "none" | "stripes" | "dots";

/** What the AI returns. Code (not the model) turns this into knots. */
export type Recipe = {
  text: string;
  motifs: MotifId[];
  motifPlacement: MotifPlacement;
  backgroundColor: string;
  mainColor: string;
  accentColor?: string;
  border: Border;
  width: number;
};

export const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string", maxLength: 20 },
    motifs: { type: "array", items: { enum: [...MOTIF_IDS] }, maxItems: 4 },
    motifPlacement: { enum: ["ends", "between_letters", "repeat", "none"] },
    backgroundColor: { type: "string" },
    mainColor: { type: "string" },
    accentColor: { type: "string" },
    border: { enum: ["none", "stripes", "dots"] },
    width: { type: "integer", minimum: 7, maximum: 20 },
  },
  required: ["text", "motifs", "motifPlacement", "backgroundColor", "mainColor", "border", "width"],
} as const;

const PLACEMENTS: MotifPlacement[] = ["ends", "between_letters", "repeat", "none"];
const BORDERS: Border[] = ["none", "stripes", "dots"];

/** Accept anything (model output, user input) and return a safe, complete recipe. */
export function sanitizeRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = normalizeText(typeof r.text === "string" ? r.text : "").slice(0, 20);
  const motifs = (Array.isArray(r.motifs) ? r.motifs : [])
    .map((m) => String(m).toLowerCase().trim())
    .filter((m): m is MotifId => (MOTIF_IDS as readonly string[]).includes(m))
    .slice(0, 4);
  let motifPlacement = PLACEMENTS.includes(r.motifPlacement as MotifPlacement)
    ? (r.motifPlacement as MotifPlacement)
    : "ends";
  if (!motifs.length) motifPlacement = "none";
  else if (motifPlacement === "none") motifPlacement = text ? "ends" : "repeat";
  if (!text && motifPlacement !== "none") motifPlacement = "repeat";

  const backgroundColor = resolveColor(r.backgroundColor as string, "white");
  let mainColor = resolveColor(r.mainColor as string, contrastingThread(backgroundColor));
  if (mainColor === backgroundColor || contrastRatio(mainColor, backgroundColor) < 1.25) {
    mainColor = contrastingThread(backgroundColor);
  }
  let accentColor = resolveColor(r.accentColor as string, mainColor);
  if (accentColor === backgroundColor) accentColor = mainColor;

  const border = BORDERS.includes(r.border as Border) ? (r.border as Border) : "none";
  const w = Number(r.width);
  const width = Number.isFinite(w) ? Math.min(20, Math.max(7, Math.round(w))) : 11;

  return { text, motifs, motifPlacement, backgroundColor, mainColor, accentColor, border, width };
}

type Block = { kind: "glyph"; bitmap: Bitmap; color: string; detail?: string } | { kind: "gap"; rows: number };

function blockRows(b: Block) {
  return b.kind === "gap" ? b.rows : rotatedFootprint(b.bitmap).rows;
}

export type BuildResult = { grid: Grid; width: number; height: number; recipe: Recipe; notes: string[] };

export type BuildOptions = { letterSpacing?: number; minHeight?: number };

export function buildFromRecipe(input: Recipe, opts: BuildOptions = {}): BuildResult {
  const recipe = sanitizeRecipe(input);
  const notes: string[] = [];
  const spacing = opts.letterSpacing ?? 1;
  const bg = recipe.backgroundColor;
  const main = recipe.mainColor;
  const accent = recipe.accentColor ?? main;
  const motifs = recipe.motifs.map((id) => MOTIFS[id]);

  // Make sure the widest element fits across the bracelet.
  const contentCols = Math.max(
    recipe.text ? FONT_HEIGHT : 0,
    ...motifs.map((m) => rotatedFootprint(m.bitmap).cols),
    1,
  );
  const needed = contentCols + (recipe.border === "none" ? 2 : 4);
  let width = recipe.width;
  if (width < needed) {
    width = Math.min(20, needed);
    notes.push(`Widened to ${width} knots so everything fits.`);
  }
  recipe.width = width;

  const letters: Block[] = [];
  glyphsFor(recipe.text).forEach((bitmap, i) => {
    if (i > 0) letters.push({ kind: "gap", rows: spacing });
    letters.push({ kind: "glyph", bitmap, color: main });
  });
  const motifBlock = (i: number): Block => {
    const m = motifs[i % motifs.length];
    return { kind: "glyph", bitmap: m.bitmap, color: accent, detail: m.detail ? resolveColor(m.detail) : accent };
  };
  const gap = (rows: number): Block => ({ kind: "gap", rows });
  const total = (blocks: Block[]) => blocks.reduce((s, b) => s + blockRows(b), 0);

  let blocks: Block[] = [];
  switch (recipe.motifPlacement) {
    case "ends": {
      blocks = [motifBlock(0), gap(3), ...letters, gap(3), motifBlock(motifs.length > 1 ? 1 : 0)];
      break;
    }
    case "between_letters": {
      let k = 0;
      for (const b of letters) {
        if (b.kind === "gap") {
          blocks.push(gap(2), motifBlock(k++), gap(2));
        } else blocks.push(b);
      }
      if (letters.length <= 1) blocks = [motifBlock(0), gap(3), ...letters, gap(3), motifBlock(0)];
      break;
    }
    case "repeat": {
      if (letters.length) {
        // Text in the middle, motifs repeating out to both ends.
        const side: Block[] = [];
        let k = 0;
        const target = Math.max(14, Math.round((44 - total(letters)) / 2));
        while (total(side) < target) side.push(motifBlock(k++), gap(3));
        blocks = [...[...side].reverse(), ...letters, gap(3), ...side];
      } else {
        let k = 0;
        while (total(blocks) < 44) blocks.push(motifBlock(k++), gap(3));
        blocks.pop();
      }
      break;
    }
    default:
      blocks = letters;
  }

  // Trim from the ends if the design is too long for the editor.
  const margin = 2;
  while (blocks.length > 1 && total(blocks) + margin * 2 > MAX_HEIGHT) {
    blocks.pop();
    notes.push("Shortened to fit the maximum length.");
  }

  const content = total(blocks);
  const height = Math.min(MAX_HEIGHT, Math.max(opts.minHeight ?? 24, content + margin * 2));
  let grid = createGrid(width, height, bg);
  let row = Math.floor((height - content) / 2);
  for (const b of blocks) {
    if (b.kind === "glyph") grid = stampRotated(grid, b.bitmap, row, b.color, b.detail ?? b.color);
    row += blockRows(b);
  }
  grid = applyBorder(grid, recipe.border, accent);

  return { grid, width, height, recipe, notes };
}

export function applyBorder(grid: Grid, border: Border, color: string): Grid {
  if (border === "none") return grid;
  const w = grid[0].length;
  const cells: [number, number][] = [];
  grid.forEach((_, r) => {
    if (border === "stripes" || r % 2 === 1) cells.push([r, 0], [r, w - 1]);
  });
  return setCells(grid, cells, color);
}

/** Insert a motif at a row, centred across the bracelet. Grows the pattern if it runs off the end. */
export function insertMotif(grid: Grid, id: MotifId, startRow: number, color: string, detail?: string): Grid {
  const motif = MOTIFS[id];
  const { rows } = rotatedFootprint(motif.bitmap);
  const width = grid[0].length;
  const bg = mostCommonColor(grid);
  let g = grid;
  const needRows = startRow + rows;
  if (needRows > g.length) {
    const extra = Math.min(MAX_HEIGHT, needRows) - g.length;
    g = [...g, ...createGrid(width, extra, bg)];
  }
  return stampRotated(g, motif.bitmap, startRow, color, detail ?? color);
}

export const PALETTE_NAMES_FOR_PROMPT = THREAD_NAMES.join(", ");
