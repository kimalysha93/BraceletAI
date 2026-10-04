import { parseDescription } from "@/lib/fallbackParser";
import type { GenerateResponse } from "@/lib/apiTypes";
import { sanitizeRecipe } from "@/lib/recipe";
import { keepRequestedText, tidyMotifs } from "@/lib/textIntent";
import { generateRecipe, OLLAMA_MODEL } from "@/lib/server/ollama";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let prompt = "";
  let retry = false;
  try {
    const body = (await request.json()) as { prompt?: unknown; retry?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 300) : "";
    retry = body.retry === true;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!prompt) return Response.json({ error: "Describe your bracelet first." }, { status: 400 });

  const started = Date.now();
  try {
    const raw = await generateRecipe(prompt, retry);
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const recipe = sanitizeRecipe({
      ...r,
      text: keepRequestedText(prompt, typeof r.text === "string" ? r.text : ""),
      motifs: tidyMotifs(prompt, sanitizeRecipe(r).motifs),
    });
    const out: GenerateResponse = { recipe, raw, mode: "ai", model: OLLAMA_MODEL, ms: Date.now() - started };
    return Response.json(out);
  } catch (err) {
    // Offline, slow, or invalid output: the keyword parser keeps the demo going.
    const recipe = parseDescription(prompt);
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "The AI took longer than 10 seconds"
        : err instanceof SyntaxError
          ? "The AI returned something unreadable"
          : "The local AI isn't running";
    const out: GenerateResponse = { recipe, raw: recipe, mode: "offline", ms: Date.now() - started, reason };
    return Response.json(out);
  }
}
