import { getStatus, isWarm, warmUp } from "@/lib/server/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getStatus();
  // Load the model in the background the first time someone opens the app.
  if (status.connected && status.modelAvailable && !isWarm()) void warmUp();
  return Response.json({ ...status, warm: isWarm() });
}

/** Explicit "Warm up AI" button: waits until the model is loaded. */
export async function POST() {
  const status = await getStatus();
  if (!status.connected) return Response.json({ ...status, warm: false });
  await warmUp();
  return Response.json({ ...status, warm: isWarm() });
}
