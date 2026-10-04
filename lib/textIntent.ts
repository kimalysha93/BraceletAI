import { THEMES } from "./backgrounds";
import { normalizeText } from "./font";
import { MOTIF_WORDS, type MotifId } from "./motifs";
import { COLOR_WORDS } from "./palette";

// Small models love to write the theme as a word ("flowers" -> FLOWERS).
// These checks keep the AI's text and motifs honest to what the person actually typed.

const ASK_FOR_WORDS = /\b(says?|saying|spells?|spelling|reads?|named|name|called|word|words|text|write|writes|letters|initials|quote)\b/i;

const NOT_NAMES = new Set([
  ...COLOR_WORDS.map((c) => c.word.toUpperCase()),
  ...Object.keys(MOTIF_WORDS).map((w) => w.toUpperCase()),
  ...Object.keys(THEMES).map((w) => w.toUpperCase()),
  "I", "A", "AN", "THE", "MY", "BRACELET", "PATTERN", "CUTE", "LOVE", "BEST", "FRIEND", "FRIENDS", "SUMMER", "FALL", "AUTUMN",
]);

/** True if every word of `text` was typed as a name: in quotes, ALL CAPS, or Capitalised mid-sentence. */
function typedAsName(prompt: string, word: string): boolean {
  const re = new RegExp(`(^|[^A-Za-z])(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=[^A-Za-z]|$)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt))) {
    const typed = m[2];
    const at = m.index + m[1].length;
    const before = prompt.slice(0, at);
    const quoted = /["“'‘]\s*$/.test(before) || /["“]/.test(before) && /["”]/.test(prompt.slice(at));
    const allCaps = typed.length > 1 && typed === typed.toUpperCase() && /[A-Z]/.test(typed);
    const capitalisedMidSentence = /^[A-Z][a-z]/.test(typed) && /\S/.test(before) && !/[.!?]\s*$/.test(before);
    if (quoted || allCaps || (capitalisedMidSentence && !NOT_NAMES.has(typed.toUpperCase()))) return true;
  }
  return false;
}

/** Keep the AI's text only if the person asked for words. */
export function keepRequestedText(prompt: string, text: string): string {
  const clean = normalizeText(text);
  if (!clean) return "";
  const words = clean.split(" ").filter((w) => /[A-Z0-9]/.test(w));
  const allTyped = words.every((w) => new RegExp(`\\b${w.replace(/[^A-Z0-9]/g, "")}\\b`, "i").test(prompt));
  if (!allTyped) return ""; // invented (e.g. "SIS" for "my sister")
  if (ASK_FOR_WORDS.test(prompt)) return clean;
  return words.every((w) => typedAsName(prompt, w.replace(/[^A-Z0-9]/g, ""))) ? clean : "";
}

/** Drop repeats, and when the person named motifs, don't pad with unrelated ones. */
export function tidyMotifs(prompt: string, motifs: MotifId[]): MotifId[] {
  const unique = [...new Set(motifs)];
  const lower = prompt.toLowerCase();
  const mentioned = new Set(
    Object.entries(MOTIF_WORDS)
      .filter(([w]) => new RegExp(`\\b${w}\\b`).test(lower))
      .map(([, id]) => id),
  );
  if (mentioned.size) {
    const kept = unique.filter((m) => mentioned.has(m));
    return kept.length ? kept : [...mentioned];
  }
  // Nothing named: trust the AI's top picks, but not a grab-bag of four.
  return unique.slice(0, 2);
}
