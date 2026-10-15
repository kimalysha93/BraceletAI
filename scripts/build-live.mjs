// Builds the static GitHub Pages copy into out/.
//
// Static export can't include API routes that read the request (the AI and publishing), so app/api is
// moved into a private folder (`_`-prefixed folders aren't routes) for the build and always put back.
import { spawnSync } from "node:child_process";
import { existsSync, renameSync, writeFileSync } from "node:fs";

const api = "app/api";
const parked = "app/_api-off-for-live";
const env = {
  ...process.env,
  NEXT_PUBLIC_LIVE_SITE: "1",
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH ?? "/BraceletAI",
};

if (existsSync(parked)) renameSync(parked, api); // tidy up after an interrupted run
renameSync(api, parked);
let status = 1;
try {
  status = spawnSync("npx", ["next", "build"], { stdio: "inherit", env }).status ?? 1;
} finally {
  renameSync(parked, api);
}
// Tell GitHub Pages not to run Jekyll, which would hide the _next folder.
if (status === 0) writeFileSync("out/.nojekyll", "");
process.exit(status);
