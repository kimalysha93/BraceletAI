# AI Bracelet Builder

Design alpha friendship bracelet patterns without the guesswork. Describe a bracelet in plain words (or draw it like pixel art), get a knottable pattern, and see exactly how much string to cut.

This is a demo prototype for a class pitch. No accounts, payments or paid APIs.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app works fully **without** any AI installed. Descriptions are then handled by a built-in keyword helper, and the header shows **Offline mode**.

## Optional: turn on the local AI (free)

```bash
# 1. Install Ollama from https://ollama.com
# 2. Download a small model (a few GB, runs on a laptop)
ollama pull llama3.2:3b
# 3. Ollama runs a local server on port 11434
ollama serve
```

Restart `npm run dev`. The header dot turns green (**AI ready**) once the model is loaded. The server warms the model up on start, and there's a **Warm up AI** button in the Describe panel too.

To use a different model, copy `.env.example` to `.env.local` and change `OLLAMA_MODEL` (any small instruct model with structured outputs works, for example a 3B–8B Qwen or Gemma).

## How the AI part works

The AI never draws knots. It turns your words into a small JSON **recipe** (text, motifs, colours, background style like stripes or an ombré fade, border, width), using Ollama's structured outputs so the reply is always valid JSON. Then plain code (`lib/recipe.ts`) builds the pattern from a hand-made pixel font and motifs. Click **Show AI recipe** in the editor to see it.

If the AI is off, takes longer than 10 seconds, or returns junk, the keyword parser (`lib/fallbackParser.ts`) builds the recipe instead, so the demo never fails.

## Demo script

1. Open **Create**, type: `a teal and white bracelet that says HELLO with stars on the ends`, press **Make my pattern**.
2. Click **Show AI recipe** to show the structured JSON.
3. In **Swap a colour** (left side), swap teal → purple. The cut list updates instantly.
4. Pick a colour and draw with the pencil to show manual editing.
5. **Publish** to the library, then open **Library**, pick a pattern, and **Remix** it.
6. Backup: if the AI is slow, offline mode still produces a pattern.

Tip: the editor autosaves a draft in your browser. Use **Library → New pattern** (or `/create?new=1`) for a blank start.

## Features

- Knot-style pattern view with row numbers, direction arrows, colour key, and a worn-bracelet preview
- Editor: pencil, fill, eraser, colour picker, mirror, undo/redo, resize, swap colour, one-click background
- 18 hand-drawn motifs (including Halloween and winter ones), themed backgrounds (rainbow, sunset, ocean…), a 5×7 pixel font for words, and photo-to-pattern (no AI: downscale and reduce colours)
- String calculator with loop / braid / tape starts, cm or inches, a calibrate mode, and "ran short / too long" feedback (saved to `data/feedback.json`)
- Pattern library with search, filters, remix credit and remix counts
- PNG export and a print view

String maths constants live in `lib/stringConfig.ts`. They're placeholders until calibrated against a real bracelet.

## Data

Published patterns are saved to `data/patterns.json`, which is created and filled with sample patterns on first run. It's gitignored, so delete it to reset the library.

## Putting it online later

The easiest host is [Vercel](https://vercel.com) (import the GitHub repo, no settings needed). On a hosted copy:

- There's no Ollama, so the AI runs in offline mode (the keyword helper). Set `OLLAMA_HOST` if you ever point it at a reachable Ollama server.
- The server can't write files, so published patterns and feedback are saved in each visitor's browser instead. Sample patterns always show.

GitHub Pages alone won't work, because the app uses server API routes.

## Tech

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, lucide-react icons, Ollama (optional). All sample patterns, motifs and the font were made for this project. No BraceletBook assets, patterns or branding are used.
