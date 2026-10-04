import "server-only";
import { MOTIF_IDS } from "../motifs";
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
  },
};

const SYSTEM_PROMPT = `You turn a short description of a friendship bracelet into a JSON recipe.
You never draw the pattern yourself; code builds it from your recipe.

Rules:
- Colours MUST be chosen from this list: ${PALETTE_NAMES_FOR_PROMPT}.
- backgroundColor is the main bracelet colour. mainColor is used for letters. accentColor is used for motifs and borders.
- Pick a mainColor that stands out against backgroundColor.
- motifs can only be: ${MOTIF_IDS.join(", ")}. Use [] if none fit.
- text is the word or name to write (max 20 characters). Leave text as "" if the user did not ask for words.
- motifPlacement: "ends" (one at each end of the text), "between_letters", "repeat" (all over), or "none".
- border: "stripes" or "dots" along the edges, otherwise "none".
- width is the number of knots across, 7 to 20. Use 11 for words unless the user says otherwise.

Examples:
Input: a pink and white bracelet that says MAYA with hearts on both ends
Output: {"text":"MAYA","motifs":["heart"],"motifPlacement":"ends","backgroundColor":"pink","mainColor":"white","accentColor":"hot pink","border":"none","width":11}

Input: night sky bracelet with moons and stars all over
Output: {"text":"","motifs":["moon","star"],"motifPlacement":"repeat","backgroundColor":"navy","mainColor":"yellow","accentColor":"yellow","border":"none","width":13}

Input: yellow and black one that says BEE HAPPY with a striped border
Output: {"text":"BEE HAPPY","motifs":[],"motifPlacement":"none","backgroundColor":"yellow","mainColor":"black","accentColor":"black","border":"stripes","width":13}`;

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

/** Ask the local model for a recipe. Throws on timeout, connection errors, or invalid JSON. */
export async function generateRecipe(prompt: string, retry = false): Promise<unknown> {
  const res = await fetchWithTimeout(
    `${OLLAMA_HOST}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "30m",
        format: SCHEMA_FOR_OLLAMA,
        options: { temperature: retry ? 0.8 : 0.2 },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
