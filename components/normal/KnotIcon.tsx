import type { Knot } from "@/lib/normal";
import { knotArrow } from "@/lib/normalLayout";

/** Small arrow icon for a knot type, matching the arrows drawn on the pattern. */
export default function KnotIcon({ knot, size = 18 }: { knot: Knot; size?: number }) {
  const a = knotArrow(knot, 10, 10, 5.5);
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path d={a.line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={a.head} fill="currentColor" stroke="currentColor" strokeWidth={0.5} strokeLinejoin="round" />
    </svg>
  );
}
