"use client";

import { countColors, type Grid } from "@/lib/grid";
import { getThread } from "@/lib/palette";

export default function Legend({
  grid,
  selected,
  onSelect,
}: {
  grid: Grid;
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const counts = countColors(grid);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {counts.map(({ id, count }) => {
        const t = getThread(id);
        const Tag = onSelect ? "button" : "span";
        return (
          <Tag
            key={id}
            onClick={onSelect ? () => onSelect(id) : undefined}
            className={`chip ${onSelect ? "cursor-pointer hover:border-berry/50" : ""} ${selected === id ? "border-berry ring-2 ring-berry/20" : ""}`}
            title={onSelect ? `Paint with ${t.name}` : undefined}
          >
            <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: t.hex }} />
            <span className="capitalize">{t.name}</span>
            <span className="text-muted tabular-nums">{count}</span>
          </Tag>
        );
      })}
    </div>
  );
}
