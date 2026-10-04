import { appendFeedback } from "@/lib/server/patternStore";

export const dynamic = "force-dynamic";

const RESULTS = ["short", "long", "right"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!RESULTS.includes(String(body.result))) return Response.json({ error: "Unknown result." }, { status: 400 });
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const entry = {
    at: new Date().toISOString(),
    result: body.result,
    patternId: typeof body.patternId === "string" ? body.patternId.slice(0, 80) : undefined,
    width: num(body.width),
    height: num(body.height),
    finishedLengthCm: num(body.finishedLengthCm),
    tailCm: num(body.tailCm),
    startMethod: typeof body.startMethod === "string" ? body.startMethod.slice(0, 10) : undefined,
    knotLengthCm: num(body.knotLengthCm),
  };
  const persisted = await appendFeedback(entry);
  return Response.json({ ok: true, persisted });
}
