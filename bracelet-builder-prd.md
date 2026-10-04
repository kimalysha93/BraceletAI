# PRD: AI Bracelet Builder (Demo Prototype)

## 1. Summary

Build a local web app for designing **alpha friendship bracelet patterns**. Users can draw patterns by hand on a grid, start from free pixel-art motifs, or describe a bracelet in plain words and have a **free local LLM** build a starting pattern. The app calculates how long to cut each string and lets users publish patterns to a shared library and remix others' patterns.

This is a **pitch demo**, not a production app. It runs on one laptop, with no accounts, payments, or ads. Priority order: it works reliably on stage, it looks clean and intuitive, then extra features.

## 2. Scope

### In scope
- Alpha patterns only (grid of knots, one colour per knot)
- Manual grid editor (no AI needed)
- Free motif presets (pixel-art icons) and text-to-pattern using a built-in pixel font
- AI generation from a text description using a local LLM through Ollama
- Photo-to-pattern (non-AI: downscale and reduce colours)
- String length calculator
- Pattern library with publish, browse, search, and remix
- Export as PNG

### Out of scope (do not build)
- Traditional ("normal") diagonal patterns and knot direction logic
- User accounts, login, payments, ads, premium tiers
- Mobile app
- Cloud deployment
- Any copying of BraceletBook patterns, images, logos, or code

## 3. Tech stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**, single project, started with `npm run dev`
- **Next.js API routes** for the LLM call and the pattern library, so the browser never calls Ollama directly (avoids CORS issues)
- **Storage:** a JSON file at `data/patterns.json`, read and written by the API routes. Seed it with sample patterns on first run.
- **UI icons:** `lucide-react` (free, ISC license)
- **LLM:** Ollama running locally at `http://localhost:11434`, called with the official `ollama` npm package or plain `fetch`
- **No other paid services or API keys**

## 4. Pattern data model

```ts
type ThreadColor = { id: string; name: string; hex: string };

type AlphaPattern = {
  id: string;
  title: string;
  author: string;            // free text, no accounts
  width: number;             // columns (knots per row)
  height: number;            // rows
  palette: ThreadColor[];    // colours used, max 8
  grid: string[][];          // grid[row][col] = ThreadColor.id
  tags: string[];
  remixedFrom?: string;      // id of the original pattern, if remixed
  createdAt: string;
  source: "manual" | "motif" | "text" | "ai" | "photo" | "remix";
};
```

- Default size: 12 wide × 40 tall. Allowed width 5 to 30, height 10 to 150.
- Built-in thread palette: about 24 named colours (red, coral, orange, yellow, mint, green, teal, sky blue, navy, lavender, purple, pink, hot pink, white, cream, beige, brown, grey, black, and so on). Use plain colour names, not thread brand names or numbers.

## 5. Pattern display (look and feel)

The pattern view should feel familiar to people who use BraceletBook's alpha patterns, without copying their assets.

- Show the pattern as a **grid of knot cells**, not flat squares. Each cell is an SVG rounded shape with a light top highlight and subtle shadow so it reads like a tied knot. Small gaps between cells.
- **Row numbers** down the left side. Mark every 5th and 10th row for easier counting.
- **Row direction arrows** (→ / ←) on the right side, alternating each row, since alpha rows are tied back and forth.
- **Colour legend** above the grid: swatch, colour name, number of knots in that colour.
- **Vertical layout by default** (the bracelet runs top to bottom), with a toggle to view it horizontally as a finished bracelet preview.
- Zoom in and out buttons.
- Optional: the user may attach a screenshot of a BraceletBook alpha pattern as a visual reference. Match the general layout and readability, but draw everything with original SVG.

## 6. Features

### 6.1 Manual editor (no AI)
- Click or click-and-drag to paint cells with the selected colour
- Tools: pencil, fill bucket, eraser (sets background colour), colour picker (eyedropper)
- Mirror toggle: paint symmetrically left/right
- Undo and redo (at least 50 steps)
- Resize width and height, keeping existing cells where possible
- Change background colour in one click
- Replace colour: swap every cell of one colour for another (this is the "recolour" behaviour makers use most)
- Clear grid with a confirmation

### 6.2 Motifs (free icons for patterns)
- Ship a set of **hand-made pixel-art motifs** stored as small JSON grids (for example 7×7 to 11×11): heart, star, flower, smiley, music note, moon, sun, cat face, paw print, lightning bolt, cherry, butterfly. Claude Code should draw these itself so there are no licensing issues.
- Users click a motif to insert it into the grid at a chosen row, centred horizontally, in the selected colour.
- Stretch goal: let users pick any `lucide-react` icon and rasterize it into a pixel grid at the pattern width. Lucide is ISC licensed, so this is allowed.

### 6.3 Text to pattern (no AI)
- Built-in **5×7 pixel font** (A to Z, 0 to 9, space, heart symbol, period, exclamation mark), hand-coded in the project.
- User types a word or name, and the app writes it down the bracelet (rotated so letters read along the bracelet), centred, with optional border rows and spacing.
- Auto-adjust pattern height to fit the text.

### 6.4 AI pattern generation (local LLM)

**How it works (important for the pitch):** the AI does not draw pixels. It turns the user's description into a small structured **recipe**, and deterministic code builds the grid from that recipe. This keeps results reliable and fast even with a small model.

1. User types something like "a pink and white bracelet that says MAYA with hearts on both ends"
2. API route sends the text to Ollama with a JSON schema in the `format` field (Ollama's structured outputs feature), so the model must return valid JSON
3. Code validates the recipe and builds the pattern from the font, motifs, and palette
4. The pattern opens in the editor, fully editable

**Recipe schema:**

```json
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "maxLength": 20 },
    "motifs": {
      "type": "array",
      "items": { "enum": ["heart","star","flower","smiley","music","moon","sun","cat","paw","lightning","cherry","butterfly"] },
      "maxItems": 4
    },
    "motifPlacement": { "enum": ["ends","between_letters","repeat","none"] },
    "backgroundColor": { "type": "string" },
    "mainColor": { "type": "string" },
    "accentColor": { "type": "string" },
    "border": { "enum": ["none","stripes","dots"] },
    "width": { "type": "integer", "minimum": 7, "maximum": 20 }
  },
  "required": ["text","motifs","motifPlacement","backgroundColor","mainColor","border","width"]
}
```

- Colour fields must be names from the built-in palette. Map unknown names to the closest palette colour.
- **System prompt** should list the palette names and motif names, give two or three example inputs with their recipes, and tell the model to leave `text` empty if the user didn't ask for words.
- **Fallback (required):** if Ollama is not running, times out (10 seconds), or returns invalid output, use a simple keyword parser (finds quoted or capitalized words for text, palette colour names, and motif names) so the demo never fails. Show a small "offline mode" label when the fallback is used.
- **"Show AI recipe" toggle:** displays the JSON the model returned next to the pattern. This is useful for the "underlying magic" slide.
- Show a loading state while waiting. Add a "Try again" button that regenerates with the same prompt.

**Ollama setup (put this in the README):**

```bash
# 1. Install Ollama from https://ollama.com
# 2. Download a small model (a few GB, runs on a laptop)
ollama pull llama3.2:3b
# 3. Ollama runs a local server on port 11434
ollama serve
```

- Model name is set in `.env.local` as `OLLAMA_MODEL`, default `llama3.2:3b`. Any small instruct model from the Ollama library that supports structured outputs should work (for example a 3B to 8B Qwen or Gemma model), so make it easy to swap.
- Add a **"Warm up AI"** step: on app start, the server sends one tiny request so the model is loaded into memory before the live demo.
- Add a status dot in the header: green (Ollama connected), grey (offline mode).

### 6.5 Photo to pattern (no AI)
- Upload an image, crop to a square or rectangle, choose width (rows auto-calculated)
- Downscale with canvas, then reduce to 3 to 6 colours and snap each to the nearest palette colour
- Opens in the editor for cleanup

### 6.6 String length calculator

Shown in a side panel on the editor and on every library pattern.

**Inputs:**
- Finished bracelet length (default 16 cm), unit toggle cm/in
- Starting method: loop, braid, or tape (straight)
- Tail length for tying off (default 10 cm each end)

**Outputs:**
- Number of base strings and their cut length
- One working string per colour, with knot count and cut length
- Total thread needed per colour
- A plain-language note, for example: "Cut 12 white base strings at 52 cm"

**Calculation (keep all constants in one config file, `lib/stringConfig.ts`):**
- Base strings: `count = width + BASE_STRING_OFFSET` (default offset 0). **Verify this against BraceletBook's string count for a few alpha patterns and adjust the offset.**
- Base string length = finished length + 2 × tail + start allowance (loop start: strings are folded, so cut half as many at double length)
- Working string per colour = knots of that colour × `KNOT_LENGTH_CM` × `CARRY_FACTOR` + 2 × tail
- Defaults are placeholders: `KNOT_LENGTH_CM = 2.0`, `CARRY_FACTOR = 1.15`, loop allowance 4 cm
- **Calibrate mode:** a small form where the user enters a real bracelet's size and how much thread it actually used. The app updates `KNOT_LENGTH_CM` and saves it. (Plan: calibrate using the founder's own bracelet before the demo.)
- Add a "Ran short / Too long" feedback button that logs the result to `data/feedback.json`. It doesn't need to change the math yet, but it shows the learning idea from the pitch.

### 6.7 Pattern library (sharing)
- **Library page:** grid of pattern cards with a thumbnail, title, author, size, and colour count
- **Search and filters:** by title or tag, width range, number of colours
- **Pattern page:** full pattern view, string calculator, tags, "Remixed from [title]" link if relevant, and buttons for Remix, Export PNG, and Print
- **Publish:** from the editor, enter title, author name, and tags, then save to the library
- **Remix:** opens a copy in the editor with `remixedFrom` set. The original pattern page shows a remix count.
- **Seed data:** 15 to 20 sample patterns created with the app's own motifs and font (names, hearts, stripes, simple flags), with made-up author names. Do not copy any real patterns.

### 6.8 Export
- Export as PNG (pattern grid with legend and row numbers)
- Print view: pattern, legend, and string cut list on one page

## 7. Pages

| Route | Purpose |
|---|---|
| `/` | Landing: tagline, three buttons (Describe it, Draw it, Browse library), 4 featured patterns |
| `/create` | Editor with tool bar, colour palette, motif drawer, text tool, AI prompt box, string calculator panel |
| `/library` | Browse and search shared patterns |
| `/pattern/[id]` | Single pattern view with calculator and remix |

## 8. Design notes
- Clean, bright, friendly. White background, one accent colour, rounded corners, generous spacing.
- Large, simple controls so a live demo is easy to follow on a projector.
- Readable at 1280×720 (projector resolution) without scrolling the main editor area.
- Use the product name **AI Bracelet Builder** in the header (placeholder; easy to change in one constants file).

## 9. Demo script (the app must support this flow)
1. Open `/create`, type: "a teal and white bracelet that says HELLO with stars on the ends"
2. Pattern appears in a few seconds. Toggle "Show AI recipe" to show the structured JSON.
3. Use Replace colour to swap teal for purple. String lengths update instantly.
4. Draw a small change with the pencil to show manual editing.
5. Publish to the library, then open the library and remix another pattern.
6. Backup: if the AI is slow, the fallback parser still produces a pattern.

## 10. Acceptance criteria
- `npm install` and `npm run dev` start the app with no paid keys
- App works fully with Ollama off (fallback mode), and uses the LLM when Ollama is on
- AI generation returns an editable pattern in under 10 seconds on a typical laptop after warm-up, or falls back
- Editor supports paint, fill, erase, eyedropper, mirror, undo/redo, resize, and replace colour
- String calculator updates live when the pattern or inputs change
- Publishing saves to `data/patterns.json` and the pattern appears in the library after refresh
- Remix creates a new pattern linked to the original
- PNG export works
- No BraceletBook assets, patterns, or branding used anywhere

## 11. Suggested build order
1. Data model, palette, seed data, and pattern renderer (knot-style SVG grid)
2. Manual editor tools and undo/redo
3. String calculator with config file and calibrate mode
4. Motifs and pixel font text tool
5. Library: publish, browse, search, pattern page, remix
6. AI generation with Ollama, schema, warm-up, status dot, and fallback parser
7. Photo to pattern
8. Export and print view
9. Polish for projector demo

## 12. Open questions for the founder
- Confirm the base string count rule for alpha patterns (offset 0 or 1) using real patterns
- Calibrate `KNOT_LENGTH_CM` with a real bracelet before the demo
- Final product name
