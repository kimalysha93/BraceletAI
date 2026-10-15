# Hosting on GitHub Pages with the AI: research and options (2026-10-15)

Status: **research only, nothing changed yet.** Decision needed from the owner (see the end).

## The problem
GitHub Pages serves static files only. Today the AI works through Next.js API routes
(`/api/generate`, `/api/generate-normal`) that call Ollama on the laptop. A static site has no server,
so those routes (and `/api/patterns`, `/api/status`, `/api/feedback`) don't exist there. The app already
falls back to the in-browser keyword parser and saves publishes in localStorage, so a static copy works,
just without the AI.

## Options

| Option | Pages alone? | Cost | Effort | Demo reliability | Privacy | First load |
|---|---|---|---|---|---|---|
| **A. AI in the browser (WebLLM)** | Yes | $0 | Medium | Good on recent Chrome/Edge on a Mac; weak on old or low-memory devices | Best (nothing leaves the device) | 290 MB–1.8 GB once, then cached |
| **B. Pages site calls the presenter's Ollama** | Yes, only on that laptop | $0 | Low | Fragile (CORS setting, Chrome permission prompt, Safari) | Good | Instant |
| **C. Hosted AI API behind a proxy** | No (needs a Cloudflare Worker / Vercel function) | $0 on free tiers | Medium | Good, needs Wi-Fi, rate limits | Text goes to a provider | Instant |
| **D. Laptop as today** | n/a | $0 | None | Best (~0.5 s, works offline) | Best | Instant |

### A. WebLLM (mlc-ai/web-llm)
- Runs the model on the GPU in the browser via WebGPU. Small models: Qwen2.5-0.5B (~290 MB), Llama-3.2-1B (~705 MB),
  Qwen2.5-1.5B (~880 MB), Llama-3.2-3B (~1.8 GB, the model used today).
- Supports **JSON-schema constrained output** (`response_format: { type: "json_object", schema }`), the same idea as
  Ollama's `format`, so the existing recipe schemas can be reused.
- Model files come from the Hugging Face CDN, which allows cross-origin requests; no special headers needed (Pages can't set them).
- Cached in the browser after the first download. Expect a few seconds to start the model on each visit.
- WebGPU: Chrome/Edge 113+ on macOS; Safari 26 on macOS Tahoe; Firefox 145 on Apple-silicon Macs (Tahoe).
- Not verified: actual speed on an M-series Mac (estimate 1–3 s per recipe for a 1B model).
- Sources: https://github.com/mlc-ai/web-llm · https://github.com/mlc-ai/web-llm/blob/main/examples/json-schema/src/json_schema.ts · https://web.dev/blog/webgpu-supported-major-browsers

### B. Pages → local Ollama
- Needs `OLLAMA_ORIGINS=https://<user>.github.io` (Ollama only allows local origins by default).
- Chrome 142+ shows a "connect to devices on your local network" permission prompt for public sites reaching localhost.
- Safari may block https → http://localhost. Works only on the machine running Ollama.
- Sources: https://docs.ollama.com/faq · https://blog.openreplay.com/chrome-local-network-access-lna-permission/

### C. Hosted API
- An API key in a static site is public, so a small proxy must hold it (Cloudflare Workers free tier: 100k requests/day).
- Providers with schema-constrained JSON: Gemini (`responseSchema`), Groq (some models). Free-tier limits not verified.
- Sources: https://developers.cloudflare.com/workers/platform/pricing/ · https://ai.google.dev/gemini-api/docs/json-mode · https://console.groq.com/docs/structured-outputs

## GitHub Pages constraints
- **Private repo → Pages needs GitHub Pro/Team.** On a free account the repo must be public (that would expose
  `bracelet-pitch.md` and the PRD). The published site is public either way.
  https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Limits: 1 GB site, ~100 GB/month bandwidth. Load models from Hugging Face, not from Pages.
  https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## What a static export would need (Next 16 docs: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`)
1. `output: "export"`, `basePath: "/BraceletAI"`, `images: { unoptimized: true }` in `next.config.ts`.
2. Remove or bypass `app/api/*` (POST handlers aren't supported). The browser fallbacks already cover library,
   publishing (localStorage) and the keyword parser.
3. `app/pattern/[id]` needs `generateStaticParams` for seeds, and a query-string page (e.g. `/pattern?id=`) for
   patterns published in the browser after the build.
4. A GitHub Actions workflow that builds and deploys `out/`.
5. For option A: a WebLLM client module, a "Load AI model" button with a progress bar, a WebGPU check, and the
   keyword parser as the fallback. Keep Ollama for the laptop build (pick by environment).

## Recommendation
- **For the pitch: present from the laptop (D).** Fastest and has no network risk.
- **For a public link: A (WebLLM + Llama-3.2-1B or Qwen2.5-1.5B) on top of a static export**, with the keyword parser
  as the fallback. Open the page before presenting so the model is cached. Accept that a 1B model is a bit less
  clever than today's 3B; the recipe schema and the code-side fixes (`applyNormalIntent`, `applyColorIntent`) limit the damage.
- Skip B (one machine, fragile). C is the right path if this grows past a class demo, but it isn't Pages-only.

## Decisions needed
1. Public repo, or upgrade to GitHub Pro to keep it private?
2. Option A (in-browser AI), or a Pages copy with offline mode only?
3. Which small model to trade off size against quality (Qwen2.5-0.5B, Llama-3.2-1B or Qwen2.5-1.5B)?
