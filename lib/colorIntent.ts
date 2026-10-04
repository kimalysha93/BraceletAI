import { MOTIF_WORDS, MOTIFS, type MotifId } from "./motifs";
import { COLOR_WORDS, contrastRatio, contrastingThread } from "./palette";
import { sanitizeRecipe, type Recipe } from "./recipe";

// Small models mix up which colour goes where ("pink hearts" -> a pink background).
// These checks read colour phrases straight from what the person typed and make them win.

export type ColorIntent = {
  motif?: string; // "pink hearts", "hearts in pink"
  background?: string; // "on a white background", "a teal bracelet"
  text?: string; // "white letters", "says MAYA in gold"
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alt = (words: string[]) => [...words].sort((a, b) => b.length - a.length).map(esc).join("|");

const C = `(${alt(COLOR_WORDS.map((c) => c.word))})`;
const M = `(?:${alt(Object.keys(MOTIF_WORDS))})`;
const AND_C = `(?:\\s*(?:,|and|&)\\s*${C})?`;
const FILLER = `(?:(?:little|tiny|small|big|cute|mini|some|lots of)\\s+)*`;

const colorId = (word: string | undefined) => (word ? COLOR_WORDS.find((c) => c.word === word.toLowerCase())?.id : undefined);

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  let best: { at: number; id: string } | undefined;
  for (const re of patterns) {
    const m = re.exec(text);
    const id = m && colorId(m[1]);
    if (id && (!best || m.index < best.at)) best = { at: m.index, id };
  }
  return best?.id;
}

export function readColorIntent(prompt: string): ColorIntent {
  const t = ` ${prompt.toLowerCase().replace(/\s+/g, " ")} `;
  return {
    motif: firstMatch(t, [
      new RegExp(`\\b${C}${AND_C}\\s+${FILLER}${M}\\b`),
      new RegExp(`\\b${M}\\s+(?:in|that are|coloured|colored)\\s+${C}\\b`),
    ]),
    background: firstMatch(t, [
      new RegExp(`\\b${C}\\s+(?:background|base)\\b`),
      new RegExp(`\\b(?:background|base)\\s+(?:of|in|is|that is)\\s+(?:a\\s+)?${C}\\b`),
      new RegExp(`\\bon\\s+(?:a\\s+|an\\s+)?${C}\\b(?!\\s+${FILLER}${M})`),
      new RegExp(`\\b${C}${AND_C}\\s+(?:friendship\\s+)?bracelet\\b`),
    ]),
    text: firstMatch(t, [
      new RegExp(`\\b${C}\\s+(?:letters|lettering|text|writing|words|font)\\b`),
      new RegExp(`\\b(?:letters|lettering|text|writing|words|name)\\s+(?:in|is|are)\\s+${C}\\b`),
      new RegExp(`\\b(?:says?|saying|spells?|reads?)\\s+\\S+(?:\\s+\\S+)?\\s+in\\s+${C}\\b`),
    ]),
  };
}

/** A clear background for a picture of this colour. */
function backgroundFor(accent: string): string {
  return contrastRatio(accent, "white") >= 1.6 ? "white" : "navy";
}

/**
 * Apply what the person said about colours on top of a recipe (from the AI or the keyword parser).
 * Pictures with an obvious real colour (red apples, green frogs) get it when no colour was named.
 */
export function applyColorIntent(input: Recipe, intent: ColorIntent): Recipe {
  const r = { ...input, backgroundColors: [...input.backgroundColors] };
  const natural = r.motifs.map((id: MotifId) => MOTIFS[id].natural).find(Boolean);

  if (intent.background) {
    r.backgroundColor = intent.background;
    if (r.backgroundStyle !== "solid" && !r.backgroundColors.includes(intent.background)) {
      r.backgroundStyle = "solid";
      r.backgroundColors = [];
    }
  }

  if (intent.motif) r.accentColor = intent.motif;
  else if (r.motifs.length) {
    const accent = r.accentColor ?? r.mainColor;
    const weak = accent === r.backgroundColor || contrastRatio(accent, r.backgroundColor) < 1.4 || r.backgroundColors.includes(accent);
    if (natural && (weak || accent === r.mainColor) && natural !== r.backgroundColor && !r.backgroundColors.includes(natural)) {
      r.accentColor = natural;
    }
  }

  // The pictures' colour was named, so the background must not swallow them.
  if (intent.motif && !intent.background) {
    if (r.backgroundColor === intent.motif || contrastRatio(intent.motif, r.backgroundColor) < 1.6) {
      r.backgroundColor = backgroundFor(intent.motif);
    }
    if (r.backgroundStyle !== "solid") {
      r.backgroundColors = r.backgroundColors.filter((c) => c !== intent.motif);
      if (r.backgroundColors.length < 2) {
        r.backgroundStyle = "solid";
        r.backgroundColors = [];
      }
    }
  }

  if (intent.text) r.mainColor = intent.text;
  else if (contrastRatio(r.mainColor, r.backgroundColor) < 1.5) r.mainColor = contrastingThread(r.backgroundColor);

  return sanitizeRecipe(r);
}
