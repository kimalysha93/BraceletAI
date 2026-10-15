"use client";

import { ArrowDown, Copy, Eraser, FlipHorizontal2, Move, PaintBucket, Pencil, Pipette, SquareDashed } from "lucide-react";
import { useState } from "react";
import { MAX_COLORS } from "@/lib/constants";
import { getThread, THREADS } from "@/lib/palette";
import ColorDropdown from "../ui/ColorDropdown";

export type Tool = "pencil" | "fill" | "eraser" | "picker" | "select";
export type SelectMode = "move" | "copy";

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Pencil }[] = [
  { id: "pencil", label: "Pencil", key: "P", icon: Pencil },
  { id: "fill", label: "Fill", key: "F", icon: PaintBucket },
  { id: "eraser", label: "Eraser", key: "E", icon: Eraser },
  { id: "picker", label: "Picker", key: "I", icon: Pipette },
  { id: "select", label: "Select", key: "S", icon: SquareDashed },
];

export default function LeftRail({
  tool,
  setTool,
  mirror,
  setMirror,
  selectMode,
  setSelectMode,
  hasSelection,
  color,
  setColor,
  bg,
  usedColors,
  onMakeBackground,
  onReplace,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  mirror: boolean;
  setMirror: (m: boolean) => void;
  selectMode: SelectMode;
  setSelectMode: (m: SelectMode) => void;
  hasSelection: boolean;
  color: string;
  setColor: (id: string) => void;
  bg: string;
  usedColors: string[];
  onMakeBackground: (id: string) => void;
  onReplace: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState("purple");
  const fromId = from && usedColors.includes(from) ? from : usedColors[0];

  return (
    <div className="space-y-5">
      <section>
        <h3 className="label">Tools</h3>
        <div className="grid grid-cols-5 gap-1">
          {TOOLS.map(({ id, label, key, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={`${label} (${key})`}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border py-2 text-[10.5px] font-bold transition ${tool === id ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMirror(!mirror)}
          title="Mirror (M): paint both sides at once"
          className={`mt-1.5 flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition ${mirror ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
        >
          <FlipHorizontal2 className="h-4 w-4" />
          Mirror left / right
          <span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition ${mirror ? "bg-berry" : "bg-line"}`}>
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition ${mirror ? "translate-x-4" : ""}`} />
          </span>
        </button>
        {tool === "select" && (
          <div className="mt-1.5 rounded-2xl border border-line bg-white p-2.5">
            <div className="flex rounded-full border border-line bg-cream p-0.5">
              {(
                [
                  ["move", "Move", Move],
                  ["copy", "Copy", Copy],
                ] as const
              ).map(([m, label, Icon]) => (
                <button
                  key={m}
                  onClick={() => setSelectMode(m)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1 text-xs font-bold transition ${selectMode === m ? "bg-berry text-white" : "text-muted hover:text-ink"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted">
              {hasSelection ? (
                <>
                  Drag inside the box to {selectMode === "move" ? "move" : "copy"} it. Hold <b>Alt/Option</b> to {selectMode === "move" ? "copy" : "move"} instead.
                  <span className="mt-1 block text-faint">Delete clears it · Esc deselects</span>
                </>
              ) : (
                "Drag over the pattern to select a rectangle of knots."
              )}
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="label mb-0">Thread colours</h3>
          <span className={`text-[11px] font-bold ${usedColors.length >= MAX_COLORS ? "text-berry" : "text-faint"}`}>
            {usedColors.length}/{MAX_COLORS} used
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {THREADS.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() => {
                setColor(t.id);
                if (tool === "eraser" || tool === "picker") setTool("pencil");
              }}
              className={`relative aspect-square rounded-full border border-black/15 transition hover:scale-110 ${color === t.id ? "scale-110 ring-[3px] ring-berry ring-offset-2" : ""}`}
              style={{ background: t.hex }}
            >
              {usedColors.includes(t.id) && <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-white bg-ink" />}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          Painting with
          <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: getThread(color).hex }} />
          <span className="text-ink capitalize">{getThread(color).name}</span>
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-3">
        <h3 className="label">Background</h3>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 shrink-0 rounded-full border border-black/15" style={{ background: getThread(bg).hex }} title={getThread(bg).name} />
          <button className="btn-soft flex-1 px-2 text-xs" onClick={() => onMakeBackground(color)} disabled={color === bg}>
            Make
            <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: getThread(color).hex }} />
            the background
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-3">
        <h3 className="label">Swap a colour</h3>
        <div className="space-y-1.5">
          <ColorDropdown value={fromId} onChange={setFrom} options={usedColors} label="Colour to replace" />
          <div className="flex items-center gap-1.5 pl-2 text-xs font-bold text-faint">
            <ArrowDown className="h-3.5 w-3.5" /> becomes
          </div>
          <ColorDropdown value={to} onChange={setTo} label="New colour" />
        </div>
        <button className="btn-primary mt-2 w-full" onClick={() => fromId && onReplace(fromId, to)} disabled={!fromId || fromId === to}>
          Swap everywhere
        </button>
      </section>
    </div>
  );
}
