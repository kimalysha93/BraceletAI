"use client";

import { memo, useId, useRef, useState, type PointerEvent } from "react";
import type { Grid } from "@/lib/grid";
import { getThread } from "@/lib/palette";

export type Orientation = "vertical" | "horizontal";

type Props = {
  grid: Grid;
  cell: number;
  orientation?: Orientation;
  guides?: boolean;
  mirrorLine?: boolean;
  interactive?: boolean;
  onStrokeStart?: (r: number, c: number) => void;
  onStrokeMove?: (r: number, c: number) => void;
  onStrokeEnd?: () => void;
};

const STRING = "#EADCE4";

/** Geometry shared by rows and the pointer maths. */
function layout(grid: Grid, cell: number, orientation: Orientation, guides: boolean) {
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  if (orientation === "vertical") {
    const left = guides ? 36 : 8;
    const right = guides ? 28 : 8;
    const top = 14;
    return { w, h, left, top, width: left + w * cell + right, height: top * 2 + h * cell };
  }
  const left = 36;
  const top = 10;
  return { w, h, left, top, width: left * 2 + h * cell, height: top * 2 + w * cell + (guides ? 18 : 0) };
}

const KnotRow = memo(function KnotRow({
  row,
  r,
  cell,
  orientation,
  left,
  top,
  gradId,
}: {
  row: string[];
  r: number;
  cell: number;
  orientation: Orientation;
  left: number;
  top: number;
  gradId: string;
}) {
  const k = cell * 0.88;
  const off = (cell - k) / 2;
  const rx = k * 0.42;
  const w = row.length;
  return (
    <g>
      {row.map((id, c) => {
        const x = orientation === "vertical" ? left + c * cell : left + r * cell;
        const y = orientation === "vertical" ? top + r * cell : top + (w - 1 - c) * cell;
        return (
          <g key={c}>
            <rect
              x={x + off}
              y={y + off}
              width={k}
              height={k}
              rx={rx}
              fill={getThread(id).hex}
              stroke="rgba(59,47,58,.16)"
              strokeWidth={1}
            />
            {cell >= 9 && <rect x={x + off} y={y + off} width={k} height={k} rx={rx} fill={`url(#${gradId})`} />}
          </g>
        );
      })}
    </g>
  );
});

export default function KnotGrid({
  grid,
  cell,
  orientation = "vertical",
  guides = true,
  mirrorLine = false,
  interactive = false,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: Props) {
  const gradId = `knot-${useId().replace(/:/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const last = useRef<string>("");
  const [hover, setHover] = useState<[number, number] | null>(null);
  const L = layout(grid, cell, orientation, guides);

  const cellAt = (e: PointerEvent<SVGSVGElement>): [number, number] | null => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / L.width;
    const x = (e.clientX - rect.left) / scale - L.left;
    const y = (e.clientY - rect.top) / scale - L.top;
    let r: number;
    let c: number;
    if (orientation === "vertical") {
      r = Math.floor(y / cell);
      c = Math.floor(x / cell);
    } else {
      r = Math.floor(x / cell);
      c = L.w - 1 - Math.floor(y / cell);
    }
    if (r < 0 || r >= L.h || c < 0 || c >= L.w) return null;
    return [r, c];
  };

  const handleDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive || e.button !== 0) return;
    const hit = cellAt(e);
    if (!hit) return;
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = hit.join(",");
    onStrokeStart?.(hit[0], hit[1]);
  };
  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const hit = cellAt(e);
    const key = hit?.join(",") ?? "";
    if (key !== (hover?.join(",") ?? "")) setHover(hit);
    if (drawing.current && hit && key !== last.current) {
      last.current = key;
      onStrokeMove?.(hit[0], hit[1]);
    }
  };
  const handleUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onStrokeEnd?.();
  };

  const vertical = orientation === "vertical";
  const hoverRect = hover
    ? vertical
      ? { x: L.left + hover[1] * cell, y: L.top + hover[0] * cell }
      : { x: L.left + hover[0] * cell, y: L.top + (L.w - 1 - hover[1]) * cell }
    : null;

  return (
    <svg
      ref={svgRef}
      width={L.width}
      height={L.height}
      viewBox={`0 0 ${L.width} ${L.height}`}
      className={`block max-w-none touch-none select-none ${interactive ? "cursor-crosshair" : ""}`}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`Bracelet pattern, ${L.w} knots wide and ${L.h} rows long`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".6" />
          <stop offset=".42" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#3b2f3a" stopOpacity=".2" />
        </linearGradient>
      </defs>

      {/* base strings running the length of the bracelet */}
      {Array.from({ length: L.w }, (_, c) =>
        vertical ? (
          <line
            key={c}
            x1={L.left + c * cell + cell / 2}
            x2={L.left + c * cell + cell / 2}
            y1={2}
            y2={L.height - 2}
            stroke={STRING}
            strokeWidth={Math.max(1.5, cell * 0.12)}
            strokeLinecap="round"
          />
        ) : (
          <line
            key={c}
            y1={L.top + c * cell + cell / 2}
            y2={L.top + c * cell + cell / 2}
            x1={6 + ((c * 7) % 10)}
            x2={L.width - 6 - ((c * 5) % 10)}
            stroke={getThread(grid[0][L.w - 1 - c]).hex}
            strokeOpacity={0.55}
            strokeWidth={Math.max(1.5, cell * 0.14)}
            strokeLinecap="round"
          />
        ),
      )}

      {/* every 10th row gets a soft band so counting is easier */}
      {guides &&
        vertical &&
        grid.map((_, r) =>
          (r + 1) % 10 === 0 ? (
            <rect key={`band-${r}`} x={L.left - 4} y={L.top + r * cell} width={L.w * cell + 8} height={cell} rx={cell / 2} fill="#EC5F99" opacity={0.1} />
          ) : null,
        )}

      {grid.map((row, r) => (
        <KnotRow key={r} row={row} r={r} cell={cell} orientation={orientation} left={L.left} top={L.top} gradId={gradId} />
      ))}

      {mirrorLine && vertical && (
        <line
          x1={L.left + (L.w * cell) / 2}
          x2={L.left + (L.w * cell) / 2}
          y1={4}
          y2={L.height - 4}
          stroke="#EC5F99"
          strokeWidth={2}
          strokeDasharray="6 6"
          opacity={0.7}
          pointerEvents="none"
        />
      )}

      {guides &&
        vertical &&
        grid.map((_, r) => {
          const n = r + 1;
          const five = n % 5 === 0;
          const ten = n % 10 === 0;
          const y = L.top + r * cell + cell / 2;
          // When zoomed out, only label every 5th row so numbers don't collide.
          if (cell < 13 && !five && n !== 1) return null;
          return (
            <g key={`g-${r}`} pointerEvents="none">
              <text
                x={L.left - 8}
                y={y}
                dominantBaseline="central"
                textAnchor="end"
                fontSize={ten ? 12 : five ? 11 : 9.5}
                fontWeight={ten ? 800 : five ? 700 : 500}
                fill={ten ? "#C93D7A" : five ? "#3B2F3A" : "#B8A8B4"}
              >
                {n}
              </text>
              <text x={L.left + L.w * cell + 8} y={y} dominantBaseline="central" fontSize={Math.min(13, cell * 0.7)} fill="#C9B9C4">
                {r % 2 === 0 ? "→" : "←"}
              </text>
            </g>
          );
        })}

      {guides &&
        !vertical &&
        grid.map((_, r) =>
          (r + 1) % 5 === 0 ? (
            <text
              key={`h-${r}`}
              x={L.left + r * cell + cell / 2}
              y={L.top * 2 + L.w * cell + 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={(r + 1) % 10 === 0 ? 800 : 600}
              fill={(r + 1) % 10 === 0 ? "#C93D7A" : "#B8A8B4"}
              pointerEvents="none"
            >
              {r + 1}
            </text>
          ) : null,
        )}

      {interactive && hoverRect && (
        <rect
          x={hoverRect.x + 0.5}
          y={hoverRect.y + 0.5}
          width={cell - 1}
          height={cell - 1}
          rx={cell * 0.4}
          fill="none"
          stroke="#3B2F3A"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
