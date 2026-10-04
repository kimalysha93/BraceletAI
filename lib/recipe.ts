import { BACKGROUND_STYLES, paintBackground, type BackgroundStyle } from "./backgrounds";
import { MAX_COLORS, MAX_HEIGHT } from "./constants";
import { FONT_HEIGHT, glyphsFor, normalizeText } from "./font";
import { createGrid, mostCommonColor, outlineCells, rotatedCells, rotatedFootprint, setCells, stampRotated, type Bitmap, type Grid } from "./grid";
import { MOTIF_IDS, MOTIFS, type MotifId } from "./motifs";
import { contrastRatio, contrastingThread, resolveColor, THREAD_NAMES } from "./palette";

export type MotifPlacement = "ends" | "between_letters" | "repeat" | "none";
export type Border = "none" | "stripes" | "dots";

/** What the AI returns. Code (not the model) turns this into knots. */
export type Recipe = {
  text: string;
  motifs: MotifId[];
  motifPlacement: MotifPlacement;
  backgroundColor: string; // solid colour, also the panel behind words on busy backgrounds
  backgroundStyle: BackgroundStyle;
  backgroundColors: string[]; // colours for the background style (empty when solid)
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
    backgroundStyle: { enum: [...BACKGROUND_STYLES] },
    backgroundColors: { type: "array", items: { type: "string" }, maxItems: 6 },
    mainColor: { type: "string" },
    accentColor: { type: "string" },
    border: { enum: ["none", "stripes", "dots"] },
    width: { type: "integer", minimum: 7, maximum: 20 },
  },
  required: ["text", "motifs", "motifPlacement", "backgroundColor", "backgroundStyle", "backgroundColors", "mainColor", "accentColor", "border", "width"],
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

  const style = BACKGROUND_STYLES.includes(r.backgroundStyle as BackgroundStyle) ? (r.backgroundStyle as BackgroundStyle) : "solid";
  let backgroundColors = [
    ...new Set((Array.isArray(r.backgroundColors) ? r.backgroundColors : []).map((c) => resolveColor(String(c), "")).filter(Boolean)),
  ].slice(0, 6);
  const backgroundColor = resolveColor(r.backgroundColor as string, backgroundColors[0] ?? "white");
  let mainColor = resolveColor(r.mainColor as string, contrastingThread(backgroundColor));
  if (mainColor === backgroundColor || contrastRatio(mainColor, backgroundColor) < 1.25) {
    mainColor = contrastingThread(backgroundColor);
  }
  let accentColor = resolveColor(r.accentColor as string, mainColor);
  if (accentColor === backgroundColor) accentColor = mainColor;

  let backgroundStyle: BackgroundStyle = style;
  if (backgroundStyle === "solid") backgroundColors = [];
  else {
    if (backgroundColors.length < 2) {
      backgroundColors = [...new Set([backgroundColor, ...backgroundColors, accentColor !== backgroundColor ? accentColor : "white"])];
    }
    if (backgroundColors.length < 2) backgroundStyle = "solid";
  }
  // Motifs should stand out from a patterned background.
  if (backgroundStyle !== "solid" && backgroundColors.includes(accentColor)) {
    accentColor = [mainColor, "white", contrastingThread(backgroundColor), "black"].find((c) => !backgroundColors.includes(c)) ?? accentColor;
  }
  // Keep within the colour limit by dropping background colours from the end.
  const detailColors = motifs.map((id) => MOTIFS[id].detail).filter(Boolean).map((c) => resolveColor(c));
  const countUsed = () => new Set([...backgroundColors, backgroundColor, mainColor, accentColor, ...detailColors]).size;
  while (countUsed() > MAX_COLORS && backgroundColors.length > 2) backgroundColors.pop();

  const border = BORDERS.includes(r.border as Border) ? (r.border as Border) : "none";
  const w = Number(r.width);
  const width = Number.isFinite(w) ? Math.min(20, Math.max(7, Math.round(w))) : 11;

  return {
    text,
    motifs,
    motifPlacement,
    backgroundColor,
    backgroundStyle,
    backgroundColors: backgroundStyle === "solid" ? [] : backgroundColors,
    mainColor,
    accentColor,
    border,
    width,
  };
}

type Block = { kind: "glyph"; bitmap: Bitmap; color: string; detail?: string; isText?: boolean } | { kind: "gap"; rows: number };

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
    letters.push({ kind: "glyph", bitmap, color: main, isText: true });
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
  const busy = recipe.backgroundStyle !== "solid";
  // Leave room for a patterned background to show around the words.
  const minHeight = opts.minHeight ?? (busy ? Math.max(40, content + 16) : 24);
  const height = Math.min(MAX_HEIGHT, Math.max(minHeight, content + margin * 2));
  let grid = busy ? paintBackground(width, height, recipe.backgroundStyle, recipe.backgroundColors) : createGrid(width, height, bg);
  const start = Math.floor((height - content) / 2);

  // On a busy background, letters get a 1-knot outline in the solid colour so they stay readable
  // while the pattern still shows around them. Motifs only get one if their colour is in the background.
  if (busy) {
    const inner: [number, number] = recipe.border === "none" ? [0, width - 1] : [1, width - 2];
    const motifsClash = recipe.backgroundColors.includes(accent);
    const textCells: [number, number][] = [];
    let row = start;
    for (const b of blocks) {
      if (b.kind === "glyph" && (b.isText || motifsClash)) {
        const cells = rotatedCells(b.bitmap, row, width).map((x): [number, number] => [x.r, x.c]);
        if (b.isText) textCells.push(...cells);
        else grid = setCells(grid, outlineCells(cells, width, height, ...inner), bg);
      }
      row += blockRows(b);
    }
    if (textCells.length) grid = setCells(grid, outlineCells(textCells, width, height, ...inner), bg);
  }

  let row = start;
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
