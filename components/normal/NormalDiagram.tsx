"use client";

import { memo, useId, useState } from "react";
import type { NormalPattern, Simulation } from "@/lib/normal";
import { knotArrow, normalLayout } from "@/lib/normalLayout";
import { stringLabel } from "@/lib/normalStrings";
import { getThread, luminance } from "@/lib/palette";

type Props = {
  pattern: NormalPattern;
  sim: Simulation;
  cell: number;
  mirrorLine?: boolean;
  onKnotDown?: (r: number, i: number) => void;
  onKnotEnter?: (r: number, i: number) => void;
  onStringClick?: (s: number) => void;
};

const LEFT = 40;
const TOP = 46;

/** The knotting diagram: strings run top to bottom and cross at each knot. */
function NormalDiagram({ pattern, sim, cell, mirrorLine, onKnotDown, onKnotEnter, onStringClick }: Props) {
  const gradId = `nk-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<string | null>(null);
  const L = normalLayout(pattern, sim, cell, LEFT, TOP);
  const n = pattern.strings.length;
  const rows = pattern.knots.length;
  const width = LEFT + L.width + 34;
  const height = TOP + L.height + 44;
  const radius = cell * 0.6;
  const endColors = sim.order[rows].map((s) => pattern.strings[s]);
  const interactive = !!onKnotDown;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-none touch-none select-none"
      role="img"
      aria-label={`Traditional pattern, ${n} strings and ${rows} rows`}
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#3b2f3a" stopOpacity=".22" />
        </radialGradient>
      </defs>

      {/* string letters and colours at the top: click to recolour */}
      {pattern.strings.map((id, s) => {
        const cx = L.x(s);
        return (
          <g
            key={`top-${s}`}
            className={onStringClick ? "cursor-pointer" : ""}
            onClick={() => onStringClick?.(s)}
            onPointerEnter={() => setHover(`s${s}`)}
            onPointerLeave={() => setHover(null)}
          >
            <title>{`String ${stringLabel(s)} · ${getThread(id).name}${onStringClick ? " (click to use the selected colour)" : ""}`}</title>
            <text x={cx} y={12} textAnchor="middle" fontSize={11} fontWeight={800} fill="#8A7A86">
              {stringLabel(s)}
            </text>
            <circle cx={cx} cy={28} r={Math.min(9, cell * 0.45)} fill={getThread(id).hex} stroke={hover === `s${s}` ? "#C93D7A" : "rgba(59,47,58,.25)"} strokeWidth={hover === `s${s}` ? 2.5 : 1} />
            <line x1={cx} x2={cx} y1={36} y2={TOP} stroke={getThread(id).hex} strokeWidth={Math.max(2, cell * 0.22)} strokeLinecap="round" />
          </g>
        );
      })}

      {/* strings, drawn under the knots */}
      <g pointerEvents="none">
        {L.segments.map((seg, j) => (
          <polyline
            key={j}
            points={seg.points.map((pt) => pt.join(",")).join(" ")}
            fill="none"
            stroke={getThread(seg.color).hex}
            strokeWidth={Math.max(2, cell * 0.22)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* outline light strings so white and cream stay visible */}
        {L.segments.map((seg, j) =>
          luminance(getThread(seg.color).hex) > 0.8 ? (
            <polyline
              key={`o-${j}`}
              points={seg.points.map((pt) => pt.join(",")).join(" ")}
              fill="none"
              stroke="rgba(59,47,58,.12)"
              strokeWidth={Math.max(2, cell * 0.22) + 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ mixBlendMode: "multiply" }}
            />
          ) : null,
        )}
      </g>

      {/* row numbers */}
      {Array.from({ length: rows }, (_, r) => {
        const n1 = r + 1;
        if (cell < 16 && n1 % 2 === 0 && n1 !== rows) return null;
        return (
          <text key={`rn-${r}`} x={LEFT - 12} y={TOP + r * cell + cell / 2} dominantBaseline="central" textAnchor="end" fontSize={n1 % 10 === 0 ? 12 : 10} fontWeight={n1 % 10 === 0 ? 800 : 500} fill={n1 % 10 === 0 ? "#C93D7A" : "#B8A8B4"}>
            {n1}
          </text>
        );
      })}

      {mirrorLine && (
        <line x1={LEFT + L.width / 2} x2={LEFT + L.width / 2} y1={TOP - 6} y2={TOP + L.height + 6} stroke="#EC5F99" strokeWidth={2} strokeDasharray="6 6" opacity={0.7} pointerEvents="none" />
      )}

      <KnotLayer knots={L.knots} radius={radius} gradId={gradId} interactive={interactive} onKnotDown={onKnotDown} onKnotEnter={onKnotEnter} />

      {/* where each string ends up: matching the top means the pattern repeats cleanly */}
      {endColors.map((id, s) => (
        <circle key={`end-${s}`} cx={L.x(s)} cy={TOP + L.height + 16} r={Math.min(7, cell * 0.35)} fill={getThread(id).hex} stroke={id === pattern.strings[s] ? "rgba(59,47,58,.25)" : "#E2463F"} strokeWidth={id === pattern.strings[s] ? 1 : 2} pointerEvents="none" />
      ))}
      <text x={LEFT + L.width / 2} y={TOP + L.height + 38} textAnchor="middle" fontSize={11} fontWeight={700} fill={sim.repeats ? "#3FAF6A" : "#C93D7A"}>
        {sim.repeats ? "✓ Strings end in their starting colours, so this repeats" : "Strings end in a different order, so the next repeat changes"}
      </text>
    </svg>
  );
}

const KnotLayer = memo(function KnotLayer({
  knots,
  radius,
  gradId,
  interactive,
  onKnotDown,
  onKnotEnter,
}: {
  knots: ReturnType<typeof normalLayout>["knots"];
  radius: number;
  gradId: string;
  interactive: boolean;
  onKnotDown?: (r: number, i: number) => void;
  onKnotEnter?: (r: number, i: number) => void;
}) {
  return (
    <g>
      {knots.map((k) => {
        const hex = getThread(k.color).hex;
        const ink = luminance(hex) > 0.55 ? "rgba(59,47,58,.7)" : "rgba(255,255,255,.92)";
        const arrow = knotArrow(k.knot, k.cx, k.cy, radius * 0.42);
        return (
          <g
            key={`${k.r}-${k.i}`}
            className={interactive ? "cursor-pointer [&:hover>circle:first-child]:stroke-[#3B2F3A] [&:hover>circle:first-child]:stroke-2" : ""}
            onPointerDown={(e) => {
              if (e.button !== 0 || !onKnotDown) return;
              e.preventDefault();
              // Let other knots receive pointerenter while dragging.
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              onKnotDown(k.r, k.i);
            }}
            onPointerEnter={(e) => e.buttons === 1 && onKnotEnter?.(k.r, k.i)}
          >
            <circle cx={k.cx} cy={k.cy} r={radius} fill={hex} stroke="rgba(59,47,58,.22)" strokeWidth={1} />
            <circle cx={k.cx} cy={k.cy} r={radius} fill={`url(#${gradId})`} pointerEvents="none" />
            {radius >= 6 && (
              <g pointerEvents="none" stroke={ink} fill={ink} strokeWidth={Math.max(1.2, radius * 0.14)} strokeLinecap="round" strokeLinejoin="round">
                <path d={arrow.line} fill="none" />
                <path d={arrow.head} strokeWidth={0.5} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

export default memo(NormalDiagram);
