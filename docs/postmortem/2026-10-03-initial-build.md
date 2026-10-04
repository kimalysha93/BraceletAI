# Postmortem: initial build of the AI Bracelet Builder demo (2026-10-03)

## What was built
All PRD sections 6.1–6.8 and the four pages: knot-style SVG renderer, editor (pencil/fill/eraser/picker, mirror, undo/redo, resize, swap colour, one-click background), 12 hand-drawn motifs, 5×7 pixel font, AI recipe generation via Ollama structured outputs with a keyword fallback, photo-to-pattern, string calculator with calibrate mode and feedback logging, library with publish/search/filter/remix, PNG export and print view. 20 seed patterns are generated from the app's own font and motifs.

## Decisions
- **AI builds a recipe, code builds knots** (`lib/recipe.ts`), as the PRD requires. Ollama gets the schema with explicit `type: "string"` on enums for grammar compatibility.
- **Fallback in two places**: the server falls back if Ollama fails or takes more than 10s; the browser falls back if the API itself is unreachable (static or offline hosting).
- **Deploy-ready storage**: `data/patterns.json` is gitignored and auto-seeded. On read-only hosts, writes fail softly and published patterns are kept in localStorage, so a Vercel deploy works with no changes.
- **Rotated stamping**: letters and motifs are stamped rotated 90° clockwise so they read upright in the worn (horizontal) preview, the same convention alpha pattern sites use.
- **Editor is client-only** (`ssr: false`) so it can read the saved draft and URL params on first render without hydration mismatches.

## Issues hit
- Tailwind v4 can't `@apply` classes defined in `@layer components`; converted them to `@utility`.
- Turbopack picked up a stray `~/yarn.lock` as the workspace root; pinned `turbopack.root`.
- History hook: read the stroke-base ref outside the state updater, because StrictMode double-invokes updaters.
- Visual QA at 1280×720 caught: cramped swap-colour dropdowns, the remix chip wrapping the toolbar, invisible white motif previews, and crowded row numbers at small zoom. All fixed.

## Verification
- `npm run lint`, `npm run build`: clean. Semgrep (typescript/react/nextjs/javascript/secrets): 0 findings.
- Headless browser run of the PRD §9 demo script: generate → show recipe → swap teal→purple (cut list updates) → pencil stroke (one undo step) → PNG export → publish → search → remix → text, motif and photo tools → resize → reload keeps the draft. No console errors.
- Not tested: a live Ollama model (not installed on this machine). The offline path was tested end to end.

## Open items (from PRD §12)
- Confirm `BASE_STRING_OFFSET` (0 vs 1) against real alpha patterns.
- Calibrate `KNOT_LENGTH_CM` with a real bracelet; the 2.0 cm placeholder gives long working-string lengths (around 10 m for the background colour on a 57-row pattern).
