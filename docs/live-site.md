# The live site (GitHub Pages)

The portfolio copy lives at **https://kimalysha93.github.io/BraceletAI/**.

## How it works
- There is **one codebase**. A build-time switch (`NEXT_PUBLIC_LIVE_SITE=1`, see `lib/site.ts`) makes the live copy:
  - show a banner explaining it's a live preview;
  - turn off publishing (buttons disabled, and `publishPattern` refuses);
  - use the keyword helper in the Describe boxes instead of the AI, labelled "Keyword mode";
  - show "Live preview" in the header instead of the AI status, and skip all server requests;
  - hide the string-length feedback buttons.
- Everything else runs in the visitor's browser: drawing, motifs, text, photos, the traditional editor,
  string lengths, PNG export, remix and drafts. Nothing a visitor does can change the site or the repo.
- `npm run build:live` builds the static site into `out/` (it sets `app/api` aside during the build, because
  GitHub Pages can't run server code).

## Branches
- **main**: where all work happens. Running `npm run dev` locally still has the AI (with Ollama) and publishing.
- **live**: what's on the website. Updating it starts `.github/workflows/deploy-pages.yml`, which builds and
  publishes the site. Never edit `live` directly; bring main into it.

## Updating the website
```bash
git checkout live
git merge main
git push origin live
git checkout main
```
Or run the workflow by hand: GitHub → Actions → "Deploy live site" → Run workflow (pick the `live` branch).

## One-time setup (on github.com)
1. Settings → General → Danger Zone → Change visibility → Public. (GitHub Pages is free for public repos.)
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Push `main` and `live`. The first deploy appears under the Actions tab; the site URL shows there when it's done.
4. Optional: Settings → Branches → add a rule for `live` so only you can push to it (strangers can't push to a
   public repo anyway, but this stops accidental force-pushes).

## Test the live copy locally
```bash
npm run build:live
mkdir -p /tmp/site && ln -sfn "$PWD/out" /tmp/site/BraceletAI
python3 -m http.server 8123 --directory /tmp/site
# open http://localhost:8123/BraceletAI/
```
