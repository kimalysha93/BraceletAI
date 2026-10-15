# AI Bracelet Builder

Design friendship bracelet patterns without the guesswork. Describe a bracelet in plain words (or draw it like pixel art), get a knottable pattern, and see exactly how much string to cut.

This is a demo prototype for a class pitch. No accounts, payments or paid APIs.

## Try the demo prototype in GitHub Pages
https://kimalysha93.github.io/BraceletAI/

Note: Publishing to a public library is disabled in the prototype. The Describe Pattern feature is also limited as the LLM is not integrated into GitHub pages. To use the local AI, download the repo and follow the instructions below to run the software locally.

## Run it locally

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

## Demo Walkthrough

1. Open **Create**, type: `a teal and white bracelet that says HELLO with stars on the ends`, press **Make my pattern**.
2. Click **Show AI recipe** to show the structured JSON.
3. In **Swap a colour** (left side), swap teal → purple. The cut list updates instantly.
4. Pick a colour and draw with the pencil to show manual editing.
5. **Publish** to the library, then open **Library**, pick a pattern, and **Remix** it.
6. Backup: if the AI is slow, offline mode still produces a pattern.

Tip: the editor autosaves a draft in your browser. Use **Library → New pattern** (or `/create?new=1`) for a blank start.

## Features

**Two kinds of bracelet.** Switch between them with the **Alpha | Traditional** toggle at the top of the editor.

**Alpha patterns** (pixel-style, one colour per knot)
- Knot-style pattern view with row numbers, direction arrows, colour key, and a worn-bracelet preview
- Editor: pencil, fill, eraser, colour picker, mirror, undo/redo, resize, swap colour, one-click background
- **Select tool:** drag a rectangle, then drag it to move it (the gap fills with the background colour) or hold Alt/Option to copy it
- 119 hand-drawn motifs in six groups (cute, food, nature, animals, holidays, fun), themed backgrounds (rainbow, sunset, ocean…), a 5×7 pixel font for words, and photo-to-pattern (no AI: downscale and reduce colours)

**Traditional patterns** (diagonal knots)
- Knot diagram with lettered strings that cross at each knot, arrows for the four knot types (forward, backward, forward-backward, backward-forward) and a worn-bracelet preview
- Click a knot to turn it, colour it, or set a knot type (drag to set several), with mirror mode for symmetric designs
- A check that tells you whether the strings end in their starting order, so the pattern repeats cleanly
- **10 classic styles** in one click: chevron, arrowhead, candy stripe, zigzag, diamonds, double chevron, criss-cross, lightning, checkerboard and ripple, each with an optional **border**
- Every pattern is worked out by simulating the strings, so it can always actually be tied

**Describe it**
- Type an idea in plain words for either kind of bracelet ("8-string sunset chevron with a black border", "pink hearts with the name MIA")
- The AI returns a small recipe and code builds the knots; **Show recipe** reveals it. Without the AI, a keyword helper does the same job

**String lengths**
- Cut list per colour (alpha) or per string (traditional), with loop / braid / tape starts, cm or inches, and a calibrate mode
- "Ran short / too long" feedback, saved to `data/feedback.json` when running locally

**Library**
- 93 example patterns, including 12 traditional ones
- Search, filters (type, width, length, colours), remix credit and remix counts; publish from either editor

**Export**
- PNG export of either kind of pattern, **as drawn or mirrored** (flipped left ↔ right), plus a print view

**Live site**
- A GitHub Pages version with a banner explaining that the AI and publishing are turned off there. Everything else works in the visitor's browser (see `docs/live-site.md`)

String maths constants live in `lib/stringConfig.ts`. They're placeholders until calibrated against a real bracelet.

## Tech

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, lucide-react icons, Ollama (optional). All sample patterns, motifs and the font were made for this project. No BraceletBook assets, patterns or branding are used.
