// Build-time switches for the GitHub Pages copy (see scripts/build-live.mjs).
// Pages only serves files: there's no server, so no AI and no shared library to publish to.

/** True when building the static live site. */
export const LIVE_SITE = process.env.NEXT_PUBLIC_LIVE_SITE === "1";

/** "/BraceletAI" on GitHub Pages, "" locally. Next's Link and router add it themselves; raw paths need it. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const withBase = (path: string) => `${BASE_PATH}${path}`;

/** Pattern pages use a query string so they work as plain static files. */
export const patternHref = (id: string) => `/pattern?id=${encodeURIComponent(id)}`;

export const REPO_URL = "https://github.com/kimalysha93/BraceletAI";

export const LIVE_PUBLISH_OFF = "Publishing is turned off on this live preview.";
