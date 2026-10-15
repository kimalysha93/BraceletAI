# Postmortem: traditional zigzag looked like a chevron; editor toggle report (2026-10-15)

## Reports
1. "8-string zig zag" (the Describe example) produced something that looked like a chevron.
2. The Alpha | Traditional toggle wasn't visible on the alpha page.

## Zigzag: root cause
The AI and the offline parser both returned `style: "zigzag"` correctly. The builder was wrong.
It alternated blocks of forward and backward knots (4 rows each on 8 strings). In the alternating-row
knot grid, forward and backward knots both swap the strings, so they route strings identically and only
change *which* string's colour shows. Switching blocks therefore never turned a stripe: it revealed a
different, out-of-order set of strings, and the short 4-row blocks read as small V shapes when worn.

## Zigzag: fix (`lib/normal.ts`)
- A zigzag needs turn knots. The cycle is now `strings − 1` forward rows, one forward-backward row
  (">" turn), `strings − 1` backward rows, one backward-forward row ("<" turn).
- Colours are laid out mirrored (A B C D D C B A). Compared across 6–20 strings and 2–6 colours, this
  layout always repeats cleanly in exactly `2 × strings` rows with good colour balance (min share
  0.6–1.0 of even), while block layouts left some colours barely visible (0.05–0.5).
- "zig-zag" (hyphenated) is now recognised by both offline parsers, and the AI prompt describes zigzag
  as wavy edge-to-edge stripes.

## Toggle: findings
- Could not reproduce: the toggle rendered and was visible at 1024–1440px widths and on every route into
  the alpha editor (home buttons, header link, the toggle itself, browser Back).
- Found a real bug on the way: the traditional editor called `history.replaceState` during render to drop
  `?new=1`, which made React report "Cannot update a component (Router) while rendering NormalEditor"
  (the red "1 Issue" badge). Moved it into an effect. This could leave client navigation in an odd state.
- Likely explanation for the report: a tab opened before the change. Asked the user to hard-refresh and
  send a screenshot if it's still missing.

## Also
- Semgrep flagged `new RegExp` built from theme names (false positive: constant keys). Replaced with a
  word-set lookup in both parsers; rescan clean.

## Verification
lint, tsc, build clean; headless browser: "8-string zig zag" → 8 strings, mirrored colours, 16 rows,
repeats cleanly, worn preview shows an edge-to-edge zigzag distinct from the chevron; no console errors.
