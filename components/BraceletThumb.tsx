import type { Grid } from "@/lib/grid";
import { getThread } from "@/lib/palette";

/** Small "finished bracelet" preview: the pattern turned sideways with string tails. */
export default function BraceletThumb({ grid, maxWidth = 280, maxCell = 7 }: { grid: Grid; maxWidth?: number; maxCell?: number }) {
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  const tail = 14;
  const cell = Math.max(2, Math.min(maxCell, (maxWidth - tail * 2) / h));
  const W = h * cell + tail * 2;
  const H = w * cell + 8;
  const k = cell * 0.86;
  const off = (cell - k) / 2;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden="true">
      {Array.from({ length: w }, (_, c) => (
        <line
          key={c}
          x1={2 + ((c * 3) % 6)}
          x2={W - 2 - ((c * 5) % 6)}
          y1={4 + c * cell + cell / 2}
          y2={4 + c * cell + cell / 2}
          stroke={getThread(grid[0][w - 1 - c]).hex}
          strokeOpacity={0.5}
          strokeWidth={Math.max(1, cell * 0.2)}
          strokeLinecap="round"
        />
      ))}
      {grid.map((row, r) =>
        row.map((id, c) => (
          <rect
            key={`${r}-${c}`}
            x={tail + r * cell + off}
            y={4 + (w - 1 - c) * cell + off}
            width={k}
            height={k}
            rx={k * 0.4}
            fill={getThread(id).hex}
            stroke="rgba(59,47,58,.12)"
            strokeWidth={0.5}
          />
        )),
      )}
    </svg>
  );
}
