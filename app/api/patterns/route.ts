import { addPattern, readPatterns } from "@/lib/server/patternStore";
import { makePatternId, validatePattern } from "@/lib/validatePattern";

export const dynamic = "force-dynamic";

export async function GET() {
  const patterns = await readPatterns();
  return Response.json({ patterns });
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 200_000) return Response.json({ error: "Pattern is too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const result = validatePattern(body, () => makePatternId(String((body as { title?: unknown })?.title ?? "")));
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  const persisted = await addPattern(result.pattern);
  // persisted=false means the host is read-only; the browser keeps a local copy instead.
  return Response.json({ pattern: result.pattern, persisted });
}
