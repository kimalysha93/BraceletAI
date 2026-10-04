"use client";

import { Type } from "lucide-react";
import { useState } from "react";
import { normalizeText, textLength } from "@/lib/font";
import { contrastingThread } from "@/lib/palette";
import type { Border, Recipe } from "@/lib/recipe";
import ColorDropdown from "../ui/ColorDropdown";

export default function TextPanel({
  initialBg,
  width,
  onMake,
}: {
  initialBg: string;
  width: number;
  onMake: (recipe: Recipe, letterSpacing: number) => void;
}) {
  const [text, setText] = useState("");
  const [bg, setBg] = useState(initialBg);
  const [main, setMain] = useState(contrastingThread(initialBg));
  const [accent, setAccent] = useState("hot-pink");
  const [border, setBorder] = useState<Border>("none");
  const [hearts, setHearts] = useState(false);
  const [spacing, setSpacing] = useState(1);
  const clean = normalizeText(text);
  const rows = textLength(clean, spacing);

  const make = () => {
    if (!clean) return;
    onMake(
      {
        text: clean,
        motifs: hearts ? ["heart"] : [],
        motifPlacement: hearts ? "ends" : "none",
        backgroundColor: bg,
        backgroundStyle: "solid",
        backgroundColors: [],
        mainColor: main,
        accentColor: accent,
        border,
        width: Math.max(9, Math.min(20, width)),
      },
      spacing,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-soft">
          <Type className="h-4 w-4 text-sky-600" />
        </span>
        <div>
          <h3 className="section-title leading-tight">Write a word</h3>
          <p className="text-xs text-muted">Letters are turned so they read the right way when you wear it.</p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="word">Word or name</label>
        <input
          id="word"
          className="input text-base font-bold tracking-wider uppercase"
          maxLength={20}
          placeholder="BESTIES"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && make()}
        />
        <p className="mt-1 text-xs text-muted">
          A–Z, 0–9, spaces, . and ! · type &lt;3 for a heart {clean && <>· about {rows} rows</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Letters</span>
          <ColorDropdown value={main} onChange={setMain} label="Letter colour" />
        </div>
        <div>
          <span className="label">Background</span>
          <ColorDropdown value={bg} onChange={setBg} label="Background colour" align="right" />
        </div>
      </div>

      <div>
        <span className="label">Edge border</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(["none", "stripes", "dots"] as Border[]).map((b) => (
            <button
              key={b}
              onClick={() => setBorder(b)}
              className={`rounded-2xl border px-2 py-1.5 text-sm font-bold capitalize transition ${border === b ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-berry" checked={hearts} onChange={(e) => setHearts(e.target.checked)} />
          Hearts on the ends
        </label>
        {(hearts || border !== "none") && (
          <div>
            <span className="label">Hearts &amp; border</span>
            <ColorDropdown value={accent} onChange={setAccent} label="Accent colour" align="right" />
          </div>
        )}
      </div>

      <div>
        <span className="label">Space between letters</span>
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setSpacing(n)}
              className={`rounded-2xl border px-2 py-1.5 text-sm font-bold transition ${spacing === n ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
            >
              {n === 1 ? "Snug (1 row)" : "Roomy (2 rows)"}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full py-2.5" disabled={!clean} onClick={make}>
        <Type className="h-4 w-4" /> Make word pattern
      </button>
    </div>
  );
}
