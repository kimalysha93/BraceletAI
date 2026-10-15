import { THEMES, type BackgroundStyle } from "./backgrounds";
import { MAX_COLORS } from "./constants";
import { buildStyle, colorRoom, fitStrings, MAX_STRINGS, MIN_STRINGS, NORMAL_STYLES, STYLE_INFO, suggestedStrings, type NormalPattern, type NormalStyle } from "./normal";
import { COLOR_WORDS, contrastingThread, resolveColor } from "./palette";

/** What the AI returns for a traditional pattern. Code (not the model) turns this into knots. */
export type NormalRecipe = {
  style: NormalStyle;
  colors: string[]; // in order from the outside in (mirrored styles) or left to right
  strings: number; // 0 = pick a good number for the colours
  border: string; // colour of a border down both edges, "" for none
};

export const NORMAL_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    style: { type: "string", enum: [...NORMAL_STYLES] },
    colors: { type: "array", items: { type: "string" }, minItems: 1, maxItems: MAX_COLORS },
    strings: { type: "integer", minimum: 0, maximum: MAX_STRINGS },
    border: { type: "string" },
  },
  required: ["style", "colors", "strings", "border"],
} as const;

const DEFAULT_COLORS = ["hot-pink", "pink", "lavender", "purple"];

/** Accept anything (model output, user input) and return a safe, complete recipe. */
export function sanitizeNormalRecipe(raw: unknown): NormalRecipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const style = NORMAL_STYLES.includes(r.style as NormalStyle) ? (r.style as NormalStyle) : "chevron";
  const colors = [
    ...new Set((Array.isArray(r.colors) ? r.colors : []).map((c) => resolveColor(String(c), "")).filter(Boolean)),
  ].slice(0, MAX_COLORS);
  // One colour on its own makes a plain band, so pair it with white (or navy for white).
  if (colors.length === 1) colors.push(colors[0] === "white" ? "navy" : "white");
  const n = Math.round(Number(r.strings) || 0);
  const strings = n ? Math.max(MIN_STRINGS, Math.min(MAX_STRINGS, n)) : 0;
  const rawBorder = typeof r.border === "string" ? r.border.trim().toLowerCase() : "";
  const border = !rawBorder || ["none", "no", "false", "off"].includes(rawBorder) ? "" : resolveColor(rawBorder, "");
  return { style, colors: colors.length ? colors : DEFAULT_COLORS, strings, border };
}

/** Turn a recipe into a pattern, with friendly notes about anything that had to change. */
export function buildFromNormalRecipe(input: NormalRecipe): { pattern: NormalPattern; recipe: NormalRecipe; notes: string[] } {
  const recipe = sanitizeNormalRecipe(input);
  const notes: string[] = [];
  const name = STYLE_INFO[recipe.style].name.toLowerCase();
  const edge = recipe.border ? 2 : 0;
  // Strings asked for include the border; the style is fitted to what's left inside it.
  const inner = recipe.strings
    ? fitStrings(recipe.style, recipe.strings - edge, MAX_STRINGS - edge)
    : Math.min(suggestedStrings(recipe.style, recipe.colors.length), fitStrings(recipe.style, MAX_STRINGS - edge, MAX_STRINGS - edge));
  const room = colorRoom(recipe.style, inner);
  let colors = recipe.colors;
  if (colors.length > room) {
    colors = colors.slice(0, room);
    notes.push(`Only ${room} colours fit on ${inner} strings for a ${name}, so the rest were left out.`);
  }
  const pattern = buildStyle(recipe.style, colors, inner + edge, recipe.border || undefined);
  const n = pattern.strings.length;
  if (recipe.strings && recipe.strings !== n) notes.push(`Used ${n} strings so the ${name}${recipe.border ? " and its border" : ""} fit evenly.`);
  return { pattern, recipe: { ...recipe, colors, strings: n }, notes };
}

// ---------- offline keyword parser ----------

// Most specific first: "double chevron" before "chevron", "wavy stripes" before "wavy".
const STYLE_WORDS: [RegExp, NormalStyle][] = [
  [/\b(double[- ]chevrons?|twin chevrons?|w[- ]shapes?|w[- ]shaped)\b/, "double-chevron"],
  [/\b(criss[- ]?cross(?:ed)?|x[- ]shapes?|lattice|kisses|xoxo)\b/, "criss-cross"],
  [/\b(checker(?:ed|board)?|checks?|checked|plaid|gingham)\b/, "checker"],
  [/\b(ripples?|rippled|wavy stripes?|wiggl[a-z]*|ribbons?)\b/, "ripple"],
  [/\b(lightning|thunder(?:bolt)?s?|bolts?)\b/, "lightning"],
  [/\b(arrow ?heads?|arrows?|upside[- ]down v)\b/, "arrowhead"],
  [/\b(chevrons?|vees?|v shapes?|v-shaped)\b/, "chevron"],
  [/\b(diamonds?|argyle)\b/, "diamond"],
  [/\b(zig[- ]?zags?|zig[- ]?zagg(?:y|ing)|waves?|wavy)\b/, "zigzag"],
  [/\b(candy ?stripes?|candy ?cane|diagonal|stripes?|striped|barber)\b/, "diagonal"],
];

const THEME_STYLE: Record<BackgroundStyle, NormalStyle> = {
  solid: "chevron",
  gradient: "chevron",
  stripes: "diagonal",
  diagonal: "diagonal",
  zigzag: "zigzag",
  checker: "checker",
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BORDER_WORD = /\b(borders?|bordered|edges?|edged|outlines?|outlined|trim)\b/;

/** What the person asked for explicitly. These win over the AI's guesses. */
export function readNormalIntent(input: string): { style?: NormalStyle; strings?: number; colors: string[]; theme?: string; border?: string } {
  const lower = ` ${input.toLowerCase()} `;
  const style = STYLE_WORDS.find(([re]) => re.test(lower))?.[1];
  const m = lower.match(/\b(\d{1,2})\s*(?:-|\s)?(?:strings?|strands?)\b/);
  const strings = m ? Number(m[1]) : undefined;

  const found: { id: string; at: number; end: number }[] = [];
  let scan = lower;
  for (const { word, id } of COLOR_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, "g");
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(scan))) {
      found.push({ id, at: hit.index, end: hit.index + word.length });
      // blank it out so "pink" doesn't match again inside "hot pink"
      scan = scan.slice(0, hit.index) + " ".repeat(word.length) + scan.slice(hit.index + word.length);
    }
  }
  found.sort((a, b) => a.at - b.at);

  // Border: "a black border", "border in black", "black edges". With no colour, pick one that stands out.
  let border: string | undefined;
  const b = BORDER_WORD.exec(lower);
  if (/\bno (border|edges?|outline)\b/.test(lower)) border = "";
  else if (b) {
    const before = found.filter((f) => f.end <= b.index && b.index - f.end <= 12).pop();
    const after = /^\s*(in|of)\b/.test(lower.slice(b.index + b[0].length)) ? found.find((f) => f.at > b.index && f.at - (b.index + b[0].length) <= 10) : undefined;
    border = (after ?? before)?.id ?? "auto";
  }

  const promptWords = new Set(lower.split(/[^a-z]+/));
  const theme = Object.keys(THEMES).find((k) => promptWords.has(k));
  // A colour named only for the border isn't part of the bracelet's palette.
  const borderOnly = border && border !== "auto" && found.filter((f) => f.id === border).length === 1 ? border : undefined;
  const colors = [...new Set(found.map((f) => f.id))].filter((c) => c !== borderOnly);
  return { style, strings, colors, theme, border };
}

/** "auto" border: navy or white, whichever stands out against the outer colour and isn't already used. */
function resolveBorder(border: string | undefined, colors: string[]): string | undefined {
  if (border !== "auto") return border;
  const pick = contrastingThread(colors[0] ?? "white");
  return colors.includes(pick) ? (pick === "navy" ? "black" : "cream") : pick;
}

/** Used when the local AI is offline, slow, or returns junk. Deliberately predictable. */
export function parseNormalDescription(input: string): NormalRecipe {
  const intent = readNormalIntent(input);
  const theme = intent.theme ? THEMES[intent.theme] : undefined;
  const colors = intent.colors.length ? intent.colors : (theme?.colors ?? DEFAULT_COLORS);
  return sanitizeNormalRecipe({
    style: intent.style ?? (theme ? THEME_STYLE[theme.style] : "chevron"),
    colors,
    strings: intent.strings ?? 0,
    border: resolveBorder(intent.border, colors) ?? "",
  });
}

/** Keep what the person explicitly asked for, even if the model forgot it. */
export function applyNormalIntent(recipe: NormalRecipe, input: string): NormalRecipe {
  const intent = readNormalIntent(input);
  // Named colours are the palette, unless there's also a theme to fill in around one colour ("pink sunset").
  const colors =
    intent.colors.length >= 2 || (intent.colors.length === 1 && !intent.theme)
      ? intent.colors
      : intent.colors.length === 1
        ? [intent.colors[0], ...recipe.colors.filter((c) => c !== intent.colors[0])]
        : recipe.colors;
  // Small models add borders nobody asked for, so only keep one the person mentioned.
  const border = intent.border === undefined ? "" : intent.border === "auto" ? recipe.border || resolveBorder("auto", colors)! : intent.border;
  // A border blends in if the same colour also runs along the edge, so keep it out of the palette unless asked for.
  const palette = border && !intent.colors.includes(border) && colors.filter((c) => c !== border).length >= 2 ? colors.filter((c) => c !== border) : colors;
  return sanitizeNormalRecipe({ style: intent.style ?? recipe.style, colors: palette, strings: intent.strings ?? recipe.strings, border });
}
