// Runs once when the server starts: pre-load the local AI model so the first demo request is quick.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getStatus, warmUp } = await import("./lib/server/ollama");
  const status = await getStatus();
  if (status.connected && status.modelAvailable) {
    console.log(`[ai] Warming up ${status.model}…`);
    warmUp().then(() => console.log("[ai] Model ready."));
  } else {
    console.log("[ai] Ollama not detected; AI requests will use offline mode.");
  }
}
