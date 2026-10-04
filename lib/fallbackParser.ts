import { THEMES, type BackgroundStyle } from "./backgrounds";
import { applyColorIntent, readColorIntent } from "./colorIntent";
import { MOTIF_WORDS, type MotifId } from "./motifs";
import { COLOR_WORDS, contrastRatio, contrastingThread } from "./palette";
import { sanitizeRecipe, type Border, type MotifPlacement, type Recipe } from "./recipe";

// Words that look like text-to-write but aren't (shouting "AND", "WITH", etc.).
const STOP = new Set([
  "A", "AN", "AND", "THE", "WITH", "THAT", "SAYS", "SAY", "ON", "OF", "IN", "FOR", "MY", "ME", "I", "IT", "TO",
  "BRACELET", "PATTERN", "ENDS", "BOTH", "SIDES", "ALL", "OVER", "WIDE", "STRINGS", "KNOTS", "SOME", "BORDER",
  "STRIPES", "DOTS", "MAKE", "PLEASE", "NAME", "WORD", "LETTERS", "CUTE", "LITTLE",
]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Simple keyword parser used when the local AI is offline, slow, or returns junk.
 * It's deliberately predictable so the live demo never fails.
 */
export function parseDescription(input: string): Recipe {
  const text = input.trim();
  const lower = ` ${text.toLowerCase()} `;

  // ---- words to write ----
  let words = "";
  const quoted = text.match(/["“”']([^"“”']{1,20})["“”']/);
  const says = text.match(/\b(?:says|say|saying|spells?|reads?|name(?:d)?|word|text)\s*[:\-]?\s+([A-Za-z0-9!.♥ ]{1,20}?)(?=\s+(?:with|and|in|on|that|plus)\b|[,;]|$)/i);
  const caps = text.match(/\b(?=[A-Z0-9!.]*[A-Z])[A-Z0-9][A-Z0-9!.]+\b/g)?.filter((w) => !STOP.has(w.replace(/[!.]/g, "")));
  if (quoted) words = quoted[1];
  else if (caps?.length) words = caps.join(" ");
  else if (says) words = says[1];

  // ---- colours, in the order they were mentioned ----
  const found: { id: string; at: number }[] = [];
  let scan = lower;
  for (const { word, id } of COLOR_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(scan))) {
      found.push({ id, at: m.index });
      // blank it out so "pink" doesn't match again inside "hot pink"
      scan = scan.slice(0, m.index) + " ".repeat(word.length) + scan.slice(m.index + word.length);
    }
  }
  // Colours tied to the pictures or the letters ("pink hearts", "white letters") aren't the bracelet's colours.
  const intent = readColorIntent(text);
  const colors = [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.id))].filter(
    (c) => c === intent.background || (c !== intent.motif && c !== intent.text),
  );

  // ---- theme ("sunset", "halloween"...) and background style ----
  const themeKey = Object.keys(THEMES).find((k) => new RegExp(`\\b${k}\\b`).test(lower));
  const theme = themeKey ? THEMES[themeKey] : undefined;
  const borderWords = "(?:border|edges?|sides)";
  const stripeBorder = new RegExp(`(stripe[sdy]?|striped)\\s+${borderWords}|${borderWords}\\s+(?:with\\s+)?stripes?`).test(lower);
  const dotBorder = new RegExp(`(dots?|dotted|polka)\\s+${borderWords}|${borderWords}\\s+(?:with\\s+)?dots|\\bdotted\\b`).test(lower);
  let style: BackgroundStyle = "solid";
  if (/\b(ombre|ombré|gradient|fade|fading)\b/.test(lower)) style = "gradient";
  else if (/\b(zig ?zags?|chevrons?)\b/.test(lower)) style = "zigzag";
  else if (/\bdiagonal/.test(lower)) style = "diagonal";
  else if (/\b(checker|checkered|checkerboard|checks)\b/.test(lower)) style = "checker";
  else if (/\bstripe/.test(lower) && !stripeBorder) style = "stripes";
  else if (theme) style = theme.style;

  let bgColors: string[] = [];
  if (style !== "solid") bgColors = colors.length >= 2 ? colors : (theme?.colors ?? [colors[0] ?? "pink", "white"]);

  // Solid: first colour is the bracelet, second is the letters ("a teal and white bracelet").
  // Patterned: words sit on a panel of the first background colour.
  const bg = style === "solid" ? (colors[0] ?? theme?.colors[0] ?? "white") : bgColors[bgColors.length - 1];
  let main = style === "solid" ? (colors[1] ?? theme?.main ?? contrastingThread(bg)) : (theme?.main ?? contrastingThread(bg));
  if (contrastRatio(main, bg) < 1.25) main = contrastingThread(bg);
  // On a patterned background, motifs need a colour the background doesn't use.
  const accent =
    style === "solid"
      ? (colors[2] ?? main)
      : ([main, theme?.main, "white", contrastingThread(bg)].find((c) => c && !bgColors.includes(c)) ?? main);

  // ---- motifs ----
  const motifs: MotifId[] = [];
  const motifWords = Object.keys(MOTIF_WORDS).sort((a, b) => b.length - a.length);
  const motifHits: { id: MotifId; at: number }[] = [];
  for (const w of motifWords) {
    const idx = lower.search(new RegExp(`\\b${escapeRe(w)}\\b`));
    if (idx >= 0) motifHits.push({ id: MOTIF_WORDS[w], at: idx });
  }
  for (const h of motifHits.sort((a, b) => a.at - b.at)) if (!motifs.includes(h.id)) motifs.push(h.id);
  if (!motifs.length && theme?.motifs) motifs.push(...(theme.motifs as MotifId[]));

  // ---- placement ----
  let placement: MotifPlacement = "none";
  if (motifs.length) {
    if (/\b(between|each letter|in between)\b/.test(lower)) placement = "between_letters";
    else if (/\b(all over|repeat|repeating|everywhere|lots of|covered|pattern of)\b/.test(lower)) placement = "repeat";
    else if (/\b(ends?|sides?|each side|both)\b/.test(lower)) placement = "ends";
    else placement = words ? "ends" : "repeat";
  }

  // ---- border ----
  let border: Border = "none";
  if (stripeBorder) border = "stripes";
  else if (dotBorder) border = "dots";

  // ---- width ----
  const widthMatch = lower.match(/\b(\d{1,2})\s*(?:-|\s)?(?:strings?|knots?|wide|columns?)\b/);
  const width = widthMatch ? Number(widthMatch[1]) : 11;

  const recipe = sanitizeRecipe({
    text: words,
    motifs,
    motifPlacement: placement,
    backgroundColor: bg,
    backgroundStyle: style,
    backgroundColors: bgColors,
    mainColor: main,
    accentColor: accent,
    border,
    width,
  });
  return applyColorIntent(recipe, intent);
}
