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
  },
  // No width: the editor keeps its current size and the builder fits the design inside it.
  required: ["text", "motifs", "motifPlacement", "backgroundColor", "backgroundStyle", "backgroundColors", "mainColor", "accentColor", "border"],
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

const total = (blocks: Block[]) => blocks.reduce((s, b) => s + blockRows(b), 0);
const gap = (rows: number): Block => ({ kind: "gap", rows });

export type BuildResult = { grid: Grid; width: number; height: number; recipe: Recipe; notes: string[] };

/**
 * `width` / `height` lock the bracelet to a size (the editor passes its current size) and the
 * design is fitted inside it. Without them the size comes from the recipe and the content.
 */
export type BuildOptions = { letterSpacing?: number; minHeight?: number; width?: number; height?: number };

/** Rows left at each end for tying off. */
const END_MARGIN = 2;
/** Fewest empty rows between a motif and its neighbour. */
const MIN_GAP = 2;

export function buildFromRecipe(input: Recipe, opts: BuildOptions = {}): BuildResult {
  const recipe = sanitizeRecipe(input);
  const notes: string[] = [];
  const spacing = opts.letterSpacing ?? 1;
  const bg = recipe.backgroundColor;
  const main = recipe.mainColor;
  const accent = recipe.accentColor ?? main;

  // ---- across: fit everything into the width ----
  let width = recipe.width;
  let border = recipe.border;
  let text = recipe.text;
  let motifIds = recipe.motifs;
  const motifCols = (id: MotifId) => rotatedFootprint(MOTIFS[id].bitmap).cols;
  if (opts.width) {
    width = opts.width;
    const inner = () => width - (border === "none" ? 0 : 2);
    // Give up the border before giving up a word or a picture.
    const tooWide = (text && inner() < FONT_HEIGHT) || motifIds.some((id) => motifCols(id) > inner());
    if (border !== "none" && tooWide) {
      border = "none";
      notes.push("Left off the border so everything fits across.");
    }
    if (text && inner() < FONT_HEIGHT) {
      text = "";
      notes.push(`Letters need at least ${FONT_HEIGHT} knots across, so the word was left out.`);
    }
    const fitting = motifIds.filter((id) => motifCols(id) <= inner());
    if (fitting.length < motifIds.length) {
      const dropped = motifIds.filter((id) => !fitting.includes(id)).map((id) => MOTIFS[id].name.toLowerCase());
      notes.push(`The ${dropped.join(" and ")} ${dropped.length > 1 ? "are" : "is"} too wide for ${width} knots, so ${dropped.length > 1 ? "they were" : "it was"} left out.`);
      motifIds = fitting;
    }
  } else {
    const contentCols = Math.max(text ? FONT_HEIGHT : 0, ...motifIds.map(motifCols), 1);
    const needed = contentCols + (border === "none" ? 2 : 4);
    if (width < needed) {
      width = Math.min(20, needed);
      notes.push(`Widened to ${width} knots so everything fits.`);
    }
  }
  const motifs = motifIds.map((id) => MOTIFS[id]);
  let placement: MotifPlacement = !motifs.length ? "none" : !text && recipe.motifPlacement !== "none" ? "repeat" : recipe.motifPlacement;

  const letters: Block[] = [];
  glyphsFor(text).forEach((bitmap, i) => {
    if (i > 0) letters.push(gap(spacing));
    letters.push({ kind: "glyph", bitmap, color: main, isText: true });
  });
  const motifBlock = (i: number): Block => {
    const m = motifs[i % motifs.length];
    return { kind: "glyph", bitmap: m.bitmap, color: accent, detail: m.detail ? resolveColor(m.detail) : accent };
  };

  // ---- along: pick the length, then lay the design out inside it ----
  const busy = recipe.backgroundStyle !== "solid";
  let height = opts.height ?? naturalHeight();
  function naturalHeight() {
    let content = total(letters);
    if (placement === "ends") content += 2 * (rotatedFootprint(motifs[0].bitmap).rows + 3);
    if (placement === "between_letters") content += Math.max(0, glyphsFor(text).length - 1) * (rotatedFootprint(motifs[0].bitmap).rows + 3);
    if (placement === "repeat") content = Math.max(44, content + 30);
    const min = opts.minHeight ?? (busy ? Math.max(40, content + 16) : 24);
    return Math.min(MAX_HEIGHT, Math.max(min, content + END_MARGIN * 2));
  }

  // Returns the layout, plus a note when something had to be left out to fit.
  const arrange = (avail: number): { blocks: Block[]; dropped?: string } => {
    const textLen = total(letters);
    if (placement === "between_letters" && glyphsFor(text).length > 1) {
      for (const g of [MIN_GAP, 1]) {
        let k = 0;
        const blocks = letters.flatMap((b) => (b.kind === "gap" ? [gap(g), motifBlock(k++), gap(g)] : [b]));
        if (total(blocks) <= avail) return { blocks };
      }
      return { blocks: letters, dropped: "Not enough length for pictures between the letters, so they were left out. Make it longer to fit them." };
    }
    if (placement === "ends" || placement === "between_letters") {
      const a = motifBlock(0);
      const b = motifBlock(motifs.length > 1 ? 1 : 0);
      for (const g of [3, MIN_GAP, 1]) {
        const blocks = [a, gap(g), ...letters, gap(g), b];
        if (total(blocks) <= avail) return { blocks };
      }
      return { blocks: letters, dropped: "Not enough length for the end pictures, so they were left out. Make it longer to fit them." };
    }
    if (placement === "repeat") {
      // Fit as many motifs as the space allows, then share the spare rows out evenly.
      const sizes = (n: number, offset: number) => Array.from({ length: n }, (_, i) => blockRows(motifBlock(offset + i)));
      const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
      if (!text) {
        let n = 0;
        while (sum(sizes(n + 1, 0)) + n * MIN_GAP <= avail) n++;
        if (!n) return { blocks: [], dropped: "The pictures are longer than the bracelet, so they were left out. Make it longer to fit them." };
        const spare = avail - sum(sizes(n, 0)) - (n - 1) * MIN_GAP;
        const g = MIN_GAP + Math.floor(spare / (n + 1));
        return { blocks: Array.from({ length: n }, (_, i) => (i ? [gap(g), motifBlock(i)] : [motifBlock(i)])).flat() };
      }
      const side = Math.floor((avail - textLen) / 2);
      let n = 0;
      while (sum(sizes(n + 1, 0)) + (n + 1) * MIN_GAP <= side) n++;
      if (!n) return { blocks: letters, dropped: "Not enough length for pictures around the word, so they were left out. Make it longer to fit them." };
      const spare = side - sum(sizes(n, 0)) - n * MIN_GAP;
      const g = MIN_GAP + Math.floor(spare / (n + 1));
      const right = Array.from({ length: n }, (_, i) => [gap(g), motifBlock(i)]).flat();
      return { blocks: [...[...right].reverse(), ...letters, ...right] };
    }
    return { blocks: letters };
  };

  // Tight on length? Thinner tying ends before leaving a picture out.
  let margin = END_MARGIN;
  let laid = arrange(height - margin * 2);
  if (laid.dropped) {
    const tighter = arrange(height - 2);
    if (!tighter.dropped) [laid, margin] = [tighter, 1];
  }
  const blocks = laid.blocks;
  if (laid.dropped) notes.push(laid.dropped);
  if (total(blocks) + margin * 2 > height) {
    // Only the words themselves can't shrink: lengthen just enough rather than cut them off.
    const need = Math.min(MAX_HEIGHT, total(blocks) + margin * 2);
    if (opts.height) notes.push(`The word needs ${need} rows, so the bracelet was made longer to fit it.`);
    height = need;
  }
  while (blocks.length > 1 && total(blocks) + margin * 2 > height) {
    blocks.pop();
    notes.push("Shortened to fit the maximum length.");
  }
  if (!blocks.some((b) => b.kind === "glyph" && !b.isText)) placement = "none";
  recipe.width = width;
  recipe.border = border;
  recipe.text = text;
  recipe.motifs = placement === "none" ? [] : motifIds;
  recipe.motifPlacement = placement;

  const content = total(blocks);
  let grid = busy ? paintBackground(width, height, recipe.backgroundStyle, recipe.backgroundColors) : createGrid(width, height, bg);
  const start = Math.floor((height - content) / 2);

  // On a busy background, letters get a 1-knot outline in the solid colour so they stay readable
  // while the pattern still shows around them. Motifs only get one if their colour is in the background.
  if (busy) {
    const inner: [number, number] = border === "none" ? [0, width - 1] : [1, width - 2];
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
  grid = applyBorder(grid, border, accent);

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
