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
  const colors = [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.id))];

  // First colour mentioned is the bracelet colour, the second is for letters ("a teal and white bracelet").
  const bg = colors[0] ?? "white";
  let main = colors[1] ?? contrastingThread(bg);
  if (contrastRatio(main, bg) < 1.25) main = contrastingThread(bg);
  const accent = colors[2] ?? main;

  // ---- motifs ----
  const motifs: MotifId[] = [];
  const motifWords = Object.keys(MOTIF_WORDS).sort((a, b) => b.length - a.length);
  const motifHits: { id: MotifId; at: number }[] = [];
  for (const w of motifWords) {
    const idx = lower.search(new RegExp(`\\b${escapeRe(w)}\\b`));
    if (idx >= 0) motifHits.push({ id: MOTIF_WORDS[w], at: idx });
  }
  for (const h of motifHits.sort((a, b) => a.at - b.at)) if (!motifs.includes(h.id)) motifs.push(h.id);

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
  if (/\bstripe/.test(lower)) border = "stripes";
  else if (/\b(dots?|dotted|polka)\b/.test(lower)) border = "dots";

  // ---- width ----
  const widthMatch = lower.match(/\b(\d{1,2})\s*(?:-|\s)?(?:strings?|knots?|wide|columns?)\b/);
  const width = widthMatch ? Number(widthMatch[1]) : 11;

  return sanitizeRecipe({
    text: words,
    motifs,
    motifPlacement: placement,
    backgroundColor: bg,
    mainColor: main,
    accentColor: accent,
    border,
    width,
  });
}
