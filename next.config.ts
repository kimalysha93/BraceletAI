import type { NextConfig } from "next";

// `npm run build:live` builds the static GitHub Pages copy (see scripts/build-live.mjs).
const live = process.env.NEXT_PUBLIC_LIVE_SITE === "1";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this project folder.
  turbopack: { root: process.cwd() },
  // Hide the dev-mode badge.
  devIndicators: false,
  ...(live && {
    output: "export",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
    // Pages serves folder/index.html, so /create/ works where /create.html wouldn't.
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
