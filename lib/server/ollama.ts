import "server-only";
import { MOTIF_CATEGORIES, MOTIF_IDS, MOTIF_LIST } from "../motifs";
import { NORMAL_RECIPE_SCHEMA } from "../normalRecipe";
import { PALETTE_NAMES_FOR_PROMPT, RECIPE_SCHEMA } from "../recipe";

export const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
export const AI_TIMEOUT_MS = 10_000;

// Ollama's grammar engine is happiest when every enum also declares its type.
const SCHEMA_FOR_OLLAMA = {
  ...RECIPE_SCHEMA,
  properties: {
    ...RECIPE_SCHEMA.properties,
    motifs: { type: "array", items: { type: "string", enum: [...MOTIF_IDS] }, maxItems: 4 },
    motifPlacement: { type: "string", enum: [...RECIPE_SCHEMA.properties.motifPlacement.enum] },
    border: { type: "string", enum: [...RECIPE_SCHEMA.properties.border.enum] },
    backgroundStyle: { type: "string", enum: [...RECIPE_SCHEMA.properties.backgroundStyle.enum] },
  },
};

// Grouped so a small model can scan for the right picture instead of reading one long list.
const MOTIFS_FOR_PROMPT = MOTIF_CATEGORIES.map(
  (c) => `  ${c.name}: ${MOTIF_LIST.filter((m) => m.category === c.id).map((m) => m.id).join(", ")}`,
).join("\n");

const SYSTEM_PROMPT = `You are a friendly friendship-bracelet designer. You turn a short description into a JSON recipe.
You never draw the pattern yourself, and you never choose its size: code fits your recipe into the bracelet the person already has.

Be creative and match the mood. Themes like "sunset", "ocean", "rainbow", "Halloween", "galaxy" or "spring"
should change the background style, colours AND motifs, not just one colour.

Fields:
- text: ONLY a word or name the user explicitly asked to write (e.g. "says HELLO", "with the name Maya", a word in quotes or capitals), max 20 characters.
  A theme or object is NOT text: "flowers", "beach vibes", "strawberry bracelet" and "for my best friend" all have text "". When unsure, use "".
- motifs: 1 or 2 little pictures that clearly fit, chosen ONLY from these ids:
${MOTIFS_FOR_PROMPT}
  Pick the closest match (e.g. ghost/pumpkin/bat for Halloween, dino for dinosaurs, bee/sunflower for summer gardens, gamepad for gamers, cupcake for birthdays, boba for bubble tea, unicorn for magic, shell/starfish for the beach, snowman for winter). Never repeat one, never add unrelated ones to fill space. Use [] if none fit.
- motifPlacement: "ends" (one each side of the text), "between_letters", "repeat" (all over), or "none".
- backgroundStyle: "solid", "stripes", "diagonal", "zigzag", "checker", or "gradient" (an ombre fade along the bracelet).
- backgroundColors: 2 to 6 colours for a non-solid background, in order. [] when solid.
- backgroundColor: the main/solid colour. Words sit on a panel of this colour, so it must contrast with mainColor.
- mainColor: colour of the letters.
- accentColor: colour of motifs and border. Make it different from mainColor when that looks nicer, and visible on the background.
- border: "stripes" or "dots" along both edges, otherwise "none".
- Colour words belong to the thing they describe: "pink hearts" means accentColor pink (NOT the background),
  "white letters" means mainColor white, "on a navy background" or "a navy bracelet" means backgroundColor navy.
  If a picture has an obvious real colour and none is given, use it (red apples, green frogs, yellow sun).
  The background must never be the same colour as the motifs.
- Every colour MUST come from this list: ${PALETTE_NAMES_FOR_PROMPT}.

Examples:
Input: a pink and white bracelet that says MAYA with hearts on both ends
Output: {"text":"MAYA","motifs":["heart"],"motifPlacement":"ends","backgroundColor":"pink","backgroundStyle":"solid","backgroundColors":[],"mainColor":"white","accentColor":"hot pink","border":"none"}

Input: sunset bracelet for my friend Jess
Output: {"text":"JESS","motifs":["sun"],"motifPlacement":"ends","backgroundColor":"purple","backgroundStyle":"gradient","backgroundColors":["yellow","orange","coral","hot pink","purple"],"mainColor":"white","accentColor":"yellow","border":"none"}

Input: pink hearts
Output: {"text":"","motifs":["heart"],"motifPlacement":"repeat","backgroundColor":"white","backgroundStyle":"solid","backgroundColors":[],"mainColor":"hot pink","accentColor":"pink","border":"none"}

Input: flowers
Output: {"text":"","motifs":["flower"],"motifPlacement":"repeat","backgroundColor":"mint","backgroundStyle":"solid","backgroundColors":[],"mainColor":"white","accentColor":"hot pink","border":"none"}

Input: beach vibes
Output: {"text":"","motifs":["sun"],"motifPlacement":"repeat","backgroundColor":"sky blue","backgroundStyle":"gradient","backgroundColors":["sky blue","beige","yellow"],"mainColor":"white","accentColor":"white","border":"none"}

Input: spooky halloween bracelet
Output: {"text":"","motifs":["pumpkin","ghost","bat"],"motifPlacement":"repeat","backgroundColor":"black","backgroundStyle":"stripes","backgroundColors":["black","purple"],"mainColor":"orange","accentColor":"orange","border":"dots"}

Input: night sky with moons and stars all over
Output: {"text":"","motifs":["moon","star"],"motifPlacement":"repeat","backgroundColor":"navy","backgroundStyle":"gradient","backgroundColors":["black","navy","purple"],"mainColor":"yellow","accentColor":"yellow","border":"none"}

Input: yellow and black one that says BEE HAPPY with a striped border
Output: {"text":"BEE HAPPY","motifs":[],"motifPlacement":"none","backgroundColor":"yellow","backgroundStyle":"solid","backgroundColors":[],"mainColor":"black","accentColor":"black","border":"stripes"}`;

const NORMAL_SYSTEM_PROMPT = `You are a friendly friendship-bracelet designer for TRADITIONAL (diagonal knot) bracelets.
You turn a short description into a JSON recipe. You never place knots yourself: code builds the pattern from your recipe.

Fields:
- style: one of
  "chevron" (classic V stripes), "arrowhead" (upside-down V), "diagonal" (candy stripe),
  "zigzag" (wavy stripes running edge to edge, also written zig zag or zig-zag), "diamond" (chevrons and arrowheads making diamonds),
  "double-chevron" (two chevrons side by side, a W shape), "criss-cross" (big X's with diamonds between, also lattice or XOXO),
  "lightning" (a zigzag with one long and one short side, like a lightning bolt),
  "checker" (checkerboard, little checks, plaid or gingham), "ripple" (wiggly stripes running along the bracelet, ribbons).
  Use the style the person names. If they don't name one, pick what suits the mood (chevron is the safe favourite).
- colors: 2 to 6 colours in order. For chevron, arrowhead and diamond the first colour is on the outside edges.
  Themes should change the colours: "sunset" is warm yellows, oranges, pinks and purple; "ocean" is blues and teal; "rainbow" is red to purple;
  "christmas" is red, white and green; "halloween" is black, orange and purple; "pastel" is soft pink, lavender, mint and sky blue.
  Every colour MUST come from this list: ${PALETTE_NAMES_FOR_PROMPT}.
- strings: the number of strings ONLY if the person gives one (e.g. "8-string"), otherwise 0.
- border: a colour ONLY if the person asks for a border, edge or outline (e.g. "with a black border"), otherwise "none".
  The border colour is not repeated in colors.

Examples:
Input: 8-string sunset chevron
Output: {"style":"chevron","colors":["yellow","orange","hot pink","purple"],"strings":8,"border":"none"}

Input: blue and white candy stripe
Output: {"style":"diagonal","colors":["blue","white"],"strings":0,"border":"none"}

Input: rainbow zigzag with a black border
Output: {"style":"zigzag","colors":["red","orange","yellow","green","blue","purple"],"strings":0,"border":"black"}

Input: something for the beach
Output: {"style":"chevron","colors":["sky blue","teal","beige","white"],"strings":0,"border":"none"}

Input: navy and white checkerboard
Output: {"style":"checker","colors":["navy","white"],"strings":0,"border":"none"}

Input: XOXO bracelet in pink and red
Output: {"style":"criss-cross","colors":["pink","red","white"],"strings":0,"border":"none"}

Input: spooky halloween diamonds
Output: {"style":"diamond","colors":["black","orange","purple"],"strings":0,"border":"none"}`;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export type OllamaStatus = { connected: boolean; modelAvailable: boolean; model: string };

export async function getStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_HOST}/api/tags`, {}, 1500);
    if (!res.ok) return { connected: false, modelAvailable: false, model: OLLAMA_MODEL };
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    const base = OLLAMA_MODEL.includes(":") ? OLLAMA_MODEL : `${OLLAMA_MODEL}:latest`;
    return { connected: true, modelAvailable: names.includes(base) || names.includes(OLLAMA_MODEL), model: OLLAMA_MODEL };
  } catch {
    return { connected: false, modelAvailable: false, model: OLLAMA_MODEL };
  }
}

let warmedUp = false;
let warming: Promise<void> | null = null;

/** Load the model into memory so the first live request is fast. Safe to call repeatedly. */
export function warmUp(): Promise<void> {
  if (warmedUp) return Promise.resolve();
  if (warming) return warming;
  warming = (async () => {
    try {
      const res = await fetchWithTimeout(
        `${OLLAMA_HOST}/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: OLLAMA_MODEL, prompt: "hi", stream: false, keep_alive: "30m", options: { num_predict: 1 } }),
        },
        60_000,
      );
      warmedUp = res.ok;
    } catch {
      warmedUp = false;
    } finally {
      warming = null;
    }
  })();
  return warming;
}

export function isWarm() {
  return warmedUp;
}

/** Ask the local model for an alpha recipe. Throws on timeout, connection errors, or invalid JSON. */
export function generateRecipe(prompt: string, retry = false): Promise<unknown> {
  return chatJson(SYSTEM_PROMPT, SCHEMA_FOR_OLLAMA, prompt, retry);
}

/** Ask the local model for a traditional (normal) pattern recipe. */
export function generateNormalRecipe(prompt: string, retry = false): Promise<unknown> {
  return chatJson(NORMAL_SYSTEM_PROMPT, NORMAL_RECIPE_SCHEMA, prompt, retry);
}

async function chatJson(system: string, format: object, prompt: string, retry: boolean): Promise<unknown> {
  const res = await fetchWithTimeout(
    `${OLLAMA_HOST}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "30m",
        format,
        options: { temperature: retry ? 0.8 : 0.2 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    },
    AI_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) throw new Error("Empty response from model");
  warmedUp = true;
  return JSON.parse(content);
}
