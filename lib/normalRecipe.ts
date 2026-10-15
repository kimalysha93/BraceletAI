import { THEMES, type BackgroundStyle } from "./backgrounds";
import { MAX_COLORS } from "./constants";
import { buildStyle, MAX_STRINGS, MIN_STRINGS, NORMAL_STYLES, STYLE_INFO, type NormalPattern, type NormalStyle } from "./normal";
import { COLOR_WORDS, resolveColor } from "./palette";

/** What the AI returns for a traditional pattern. Code (not the model) turns this into knots. */
export type NormalRecipe = {
  style: NormalStyle;
  colors: string[]; // in order from the outside in (mirrored styles) or left to right
  strings: number; // 0 = pick a good number for the colours
};

export const NORMAL_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    style: { type: "string", enum: [...NORMAL_STYLES] },
    colors: { type: "array", items: { type: "string" }, minItems: 1, maxItems: MAX_COLORS },
    strings: { type: "integer", minimum: 0, maximum: MAX_STRINGS },
  },
  required: ["style", "colors", "strings"],
} as const;

const DEFAULT_COLORS = ["hot-pink", "pink", "lavender", "purple"];

/** Accept anything (model output, user input) and return a safe, complete recipe. */
export function sanitizeNormalRecipe(raw: unknown): NormalRecipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const style = NORMAL_STYLES.includes(r.style as NormalStyle) ? (r.style as NormalStyle) : "chevron";
  const colors = [
    ...new Set((Array.isArray(r.colors) ? r.colors : []).map((c) => resolveColor(String(c), "")).filter(Boolean)),
  ].slice(0, MAX_COLORS);
  const n = Math.round(Number(r.strings) || 0);
  const strings = n ? Math.max(MIN_STRINGS, Math.min(MAX_STRINGS, n)) : 0;
  // One colour on its own makes a plain band, so pair it with white (or navy for white).
  if (colors.length === 1) colors.push(colors[0] === "white" ? "navy" : "white");
  return { style, colors: colors.length ? colors : DEFAULT_COLORS, strings };
}

/** Turn a recipe into a pattern, with friendly notes about anything that had to change. */
export function buildFromNormalRecipe(input: NormalRecipe): { pattern: NormalPattern; recipe: NormalRecipe; notes: string[] } {
  const recipe = sanitizeNormalRecipe(input);
  const notes: string[] = [];
  const mirrored = STYLE_INFO[recipe.style].mirrored;
  let colors = recipe.colors;
  // Two strings per colour (per side for mirrored styles) gives stripes you can actually see.
  let n = recipe.strings || Math.max(8, colors.length * 2);
  if (n % 2) n++;
  n = Math.min(MAX_STRINGS, n);
  const room = mirrored ? n / 2 : n;
  if (colors.length > room) {
    colors = colors.slice(0, room);
    notes.push(`Only ${room} colours fit on ${n} strings for a ${STYLE_INFO[recipe.style].name.toLowerCase()}, so the rest were left out.`);
  }
  if (recipe.strings && recipe.strings !== n) notes.push(`Used ${n} strings so the ${STYLE_INFO[recipe.style].name.toLowerCase()} stays even.`);
  return { pattern: buildStyle(recipe.style, colors, n), recipe: { ...recipe, colors, strings: n }, notes };
}

// ---------- offline keyword parser ----------

const STYLE_WORDS: [RegExp, NormalStyle][] = [
  [/\b(arrow ?heads?|arrows?|upside[- ]down v)\b/, "arrowhead"],
  [/\b(chevrons?|vees?|v shapes?|v-shaped)\b/, "chevron"],
  [/\b(diamonds?|argyle|x shapes?)\b/, "diamond"],
  [/\b(zig[- ]?zags?|zig[- ]?zagg(?:y|ing)|waves?|wavy|lightning)\b/, "zigzag"],
  [/\b(candy ?stripes?|candy ?cane|diagonal|stripes?|striped|barber)\b/, "diagonal"],
];

const THEME_STYLE: Record<BackgroundStyle, NormalStyle> = {
  solid: "chevron",
  gradient: "chevron",
  stripes: "diagonal",
  diagonal: "diagonal",
  zigzag: "zigzag",
  checker: "diamond",
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** What the person asked for explicitly. These win over the AI's guesses. */
export function readNormalIntent(input: string): { style?: NormalStyle; strings?: number; colors: string[]; theme?: string } {
  const lower = ` ${input.toLowerCase()} `;
  const style = STYLE_WORDS.find(([re]) => re.test(lower))?.[1];
  const m = lower.match(/\b(\d{1,2})\s*(?:-|\s)?(?:strings?|strands?)\b/);
  const strings = m ? Number(m[1]) : undefined;

  const found: { id: string; at: number }[] = [];
  let scan = lower;
  for (const { word, id } of COLOR_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, "g");
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(scan))) {
      found.push({ id, at: hit.index });
      // blank it out so "pink" doesn't match again inside "hot pink"
      scan = scan.slice(0, hit.index) + " ".repeat(word.length) + scan.slice(hit.index + word.length);
    }
  }
  const colors = [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.id))];
  // Theme names are single words, so a word list avoids building regexes from variables.
  const words = new Set(lower.split(/[^a-z]+/));
  const theme = Object.keys(THEMES).find((k) => words.has(k));
  return { style, strings, colors, theme };
}

/** Used when the local AI is offline, slow, or returns junk. Deliberately predictable. */
export function parseNormalDescription(input: string): NormalRecipe {
  const intent = readNormalIntent(input);
  const theme = intent.theme ? THEMES[intent.theme] : undefined;
  return sanitizeNormalRecipe({
    style: intent.style ?? (theme ? THEME_STYLE[theme.style] : "chevron"),
    colors: intent.colors.length ? intent.colors : (theme?.colors ?? DEFAULT_COLORS),
    strings: intent.strings ?? 0,
  });
}

/** Keep what the person explicitly asked for, even if the model forgot it. */
export function applyNormalIntent(recipe: NormalRecipe, input: string): NormalRecipe {
  const intent = readNormalIntent(input);
  return sanitizeNormalRecipe({
    style: intent.style ?? recipe.style,
    // Named colours are the palette, unless there's also a theme to fill in around one colour ("pink sunset").
    colors:
      intent.colors.length >= 2 || (intent.colors.length === 1 && !intent.theme)
        ? intent.colors
        : intent.colors.length === 1
          ? [intent.colors[0], ...recipe.colors.filter((c) => c !== intent.colors[0])]
          : recipe.colors,
    strings: intent.strings ?? recipe.strings,
  });
}
