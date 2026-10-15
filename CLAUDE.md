@AGENTS.md

# AI Bracelet Builder (pitch demo)

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4. Spec: `bracelet-builder-prd.md`. Pitch context: `bracelet-pitch.md`.

## Commands
- `npm install` then `npm run dev` → app at **http://localhost:3000** (this is the URL for browser testing)
- `npm run build` (must pass), `npm run lint`
- Optional local AI: `ollama pull llama3.2:3b` and `ollama serve` (port 11434). Without it the app runs in offline mode.

## Layout
- `lib/` pure logic shared by client and server: palette, grid ops, 5×7 font, motifs, recipe → pattern builder, offline keyword parser, string maths (`lib/stringConfig.ts` holds every tunable constant), seed patterns.
- `lib/server/` server-only: JSON-file pattern store (`data/patterns.json`, auto-seeded, gitignored) and the Ollama client.
- `app/api/*` route handlers: `patterns` (GET/POST), `generate` (AI recipe with fallback), `generate-normal` (traditional recipe with fallback), `status` (Ollama health + warm-up), `feedback`.
- `components/editor/*` the `/create` alpha editor (client-only, loaded with `ssr: false`).
- Traditional (diagonal knot) patterns: `/create/normal`, `components/normal/*`. Logic in `lib/normal.ts` (knot simulation, classic styles, mirroring), `lib/normalRecipe.ts` (AI recipe + offline parser), `lib/normalLayout.ts` (geometry shared by the diagram and PNG export), `lib/normalStrings.ts`. Library entries are a union (`LibraryPattern` in `lib/types.ts`): `kind: "normal"` holds `normal` (strings + knots); entries with no kind are alpha.

## Rules
- The AI only returns a recipe; `lib/recipe.ts` builds the knots. Keep it that way.
- Everything must work with Ollama off and on read-only hosts (publishes fall back to localStorage).
- Product name lives in `lib/constants.ts`.
- Tailwind custom classes are defined with `@utility` in `app/globals.css` (v4 can't `@apply` `@layer components` classes).
- No BraceletBook assets, patterns or branding.
