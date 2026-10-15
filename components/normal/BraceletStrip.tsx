"use client";

import { useId } from "react";
import type { NormalPattern, Simulation } from "@/lib/normal";
import { braceletDiamonds } from "@/lib/normalLayout";
import { getThread } from "@/lib/palette";

/** How the pattern looks worn: knots as interlocking diamonds, repeated along the bracelet. */
export default function BraceletStrip({
  pattern,
  sim,
  knot = 9,
  rows = 60,
  className = "",
  fluid = false,
}: {
  pattern: NormalPattern;
  sim: Simulation;
  knot?: number;
  rows?: number;
  className?: string;
  /** Scale to the container's width instead of a fixed knot size (library cards, publish preview). */
  fluid?: boolean;
}) {
  const gradId = `bs-${useId().replace(/:/g, "")}`;
  const w = knot * 0.62;
  const h = knot * 0.5;
  const { diamonds, width, height } = braceletDiamonds(pattern, sim, w, h, rows);
  const pad = 4;
  return (
    <svg
      width={fluid ? "100%" : width + pad * 2}
      height={fluid ? undefined : height + pad * 2}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      className={`block ${fluid ? "" : "max-w-none"} ${className}`}
      role="img"
      aria-label="Bracelet preview"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
      </defs>
      <rect x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2} rx={height / 4} fill="#F4EAF0" />
      {diamonds.map((d, j) => {
        const pts = `${d.x - w},${d.y} ${d.x},${d.y - h} ${d.x + w},${d.y} ${d.x},${d.y + h}`;
        return (
          <g key={j}>
            <polygon points={pts} fill={getThread(d.color).hex} stroke="rgba(59,47,58,.18)" strokeWidth={0.6} strokeLinejoin="round" />
            <polygon points={pts} fill={`url(#${gradId})`} />
          </g>
        );
      })}
    </svg>
  );
}
