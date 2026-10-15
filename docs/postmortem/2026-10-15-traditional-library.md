# Postmortem: traditional patterns in the library (2026-10-15)

## Request
Add traditional patterns to the library examples; research GitHub Pages hosting with the AI.

## Library
- `LibraryPattern = AlphaPattern | TraditionalPattern` (`lib/types.ts`). Traditional entries use `kind: "normal"` and
  store `normal` (strings + knots); width = strings, height = rows in one repeat. Entries with no `kind`
  (all existing data) are alpha, so no migration was needed.
- 12 traditional seeds (`lib/seed.ts`), one per style plus bordered and remix examples, all tagged `traditional`.
  `readPatterns` already merges new seeds into an existing `data/patterns.json`.
- Server validation checks string count, even rows, every row's knot count and knot types, colours and the
  colour limit.
- Cards show a worn preview and a Traditional badge. The library has an All / Alpha / Traditional filter.
  Traditional patterns pass every length filter, since they repeat to any length.
- The pattern page branches for traditional: worn preview, knot diagram, knot-count key, per-string cut list,
  traditional PNG export, and Remix opens `/create/normal?remix=`. The alpha editor redirects traditional remix
  links there.
- The traditional editor can remix (with credit) and publish. `PublishModal` now takes a `preview` node instead of a grid.

## Issues hit
- `Omit` over a union collapses to the common fields; used a distributive conditional type for `PublishInput`.
- `PatternCard` also renders on the server (home page), so the traditional thumbnail can't use hooks;
  `simulate` runs directly instead (cheap).
- Test publishes write to `data/patterns.json`; backed it up and restored it after the browser run.

## Verification
lint, tsc, build clean; semgrep 0 findings. API rejects malformed traditional patterns. Headless browser:
library filter (12 traditional), pattern page, PNG export, remix → publish → new page credits the original,
alpha pages and alpha editor still work, no console errors.

## Hosting research
See `docs/prd/github-pages-hosting.md`. Summary: Pages can't run the current server-side AI; an in-browser
model (WebLLM) is the only Pages-only way to keep AI; present from the laptop for the pitch.
