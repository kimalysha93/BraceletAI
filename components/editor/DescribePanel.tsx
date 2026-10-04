"use client";

import { Braces, RotateCcw, Sparkles, WifiOff, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { aiIsReady, refreshAiStatus, useAiStatus } from "@/lib/aiStatus";
import type { GenerateResponse } from "@/lib/apiTypes";
import { parseDescription } from "@/lib/fallbackParser";
import type { Recipe } from "@/lib/recipe";

const EXAMPLES = [
  "a teal and white bracelet that says HELLO with stars on the ends",
  "a sunset ombre bracelet for my friend JESS",
  "spooky halloween bracelet with ghosts and pumpkins",
  "rainbow diagonal stripes with white hearts all over",
];

const LOADING_LINES = ["Picking your colours…", "Reading your idea…", "Knotting it together…"];

export default function DescribePanel({
  onRecipe,
  autoFocus,
}: {
  onRecipe: (recipe: Recipe) => void;
  autoFocus?: boolean;
}) {
  const status = useAiStatus();
  const ready = aiIsReady(status);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(0);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [warming, setWarming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1100);
    return () => clearInterval(t);
  }, [loading]);

  const generate = async (retry = false) => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setLine(0);
    let data: GenerateResponse;
    const started = performance.now();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, retry }),
      });
      if (!res.ok) throw new Error("bad response");
      data = (await res.json()) as GenerateResponse;
    } catch {
      // No server at all (e.g. a static demo): parse in the browser.
      const recipe = parseDescription(text);
      data = { recipe, raw: recipe, mode: "offline", ms: Math.round(performance.now() - started), reason: "No server connection" };
    }
    setResult(data);
    setLoading(false);
    onRecipe(data.recipe);
  };

  const warmUp = async () => {
    setWarming(true);
    await refreshAiStatus("POST");
    setWarming(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lav-soft">
          <Sparkles className="h-4 w-4 text-purple-500" />
        </span>
        <div>
          <h3 className="section-title leading-tight">Describe your bracelet</h3>
          <p className="text-xs text-muted">Colours, a word or name, and any little pictures.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
        className="space-y-2"
      >
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void generate();
            }
          }}
          rows={3}
          maxLength={300}
          placeholder="e.g. a mint and white bracelet that says LUCY with flowers on the ends"
          className="input resize-none text-[15px] leading-snug"
        />
        <button type="submit" className="btn-primary w-full py-2.5 text-[15px]" disabled={!prompt.trim() || loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-white" style={{ animation: `bead-bounce 1s ${i * 0.15}s infinite` }} />
                ))}
              </span>
              {LOADING_LINES[line]}
            </span>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Make my pattern
            </>
          )}
        </button>
      </form>

      {!result && (
        <div className="space-y-1.5">
          <p className="label">Try one of these</p>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="block w-full rounded-2xl border border-line bg-cream px-3 py-2 text-left text-[13px] leading-snug text-ink transition hover:border-berry/40 hover:bg-blush/50"
            >
              “{ex}”
            </button>
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="animate-pop-in space-y-3 rounded-2xl border border-line bg-cream p-3">
          <div className="flex flex-wrap items-center gap-2">
            {result.mode === "ai" ? (
              <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">
                <Zap className="h-3.5 w-3.5" /> Made by AI ({result.model}) in {(result.ms / 1000).toFixed(1)}s
              </span>
            ) : (
              <span className="chip border-gray-200 bg-gray-50 text-gray-600" title={result.reason}>
                <WifiOff className="h-3.5 w-3.5" /> Offline mode
              </span>
            )}
          </div>
          {result.mode === "offline" && (
            <p className="text-xs text-muted">
              {result.reason ?? "The AI is offline"}, so the keyword helper built this instead. It still works the same way: words in, recipe out, code
              builds the knots.
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-soft flex-1" onClick={() => generate(true)}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button className={`btn-soft flex-1 ${showRecipe ? "border-berry bg-blush text-berry-dark" : ""}`} onClick={() => setShowRecipe((v) => !v)}>
              <Braces className="h-4 w-4" /> {showRecipe ? "Hide" : "Show"} AI recipe
            </button>
          </div>
          {showRecipe && (
            <div className="animate-pop-in">
              <p className="mb-1.5 text-xs text-muted">
                The AI only writes this little recipe. Our pattern engine turns it into real, knottable rows, so every pattern follows the rules.
              </p>
              <pre className="max-h-64 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11.5px] leading-relaxed text-pink-100">
                {JSON.stringify(result.recipe, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {status && !ready && status.connected && (
        <p className="rounded-2xl bg-butter px-3 py-2 text-xs">
          Ollama is running, but the model <b>{status.model}</b> isn&apos;t downloaded. Run <code>ollama pull {status.model}</code>.
        </p>
      )}
      {ready && !status?.warm && (
        <button className="btn-ghost w-full text-xs" onClick={warmUp} disabled={warming}>
          <Zap className="h-3.5 w-3.5" /> {warming ? "Warming up the AI…" : "Warm up AI (loads the model so it's quick)"}
        </button>
      )}
    </div>
  );
}
