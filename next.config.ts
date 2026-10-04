import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this project folder.
  turbopack: { root: process.cwd() },
  // Hide the dev-mode badge so it doesn't show up on the projector.
  devIndicators: false,
};

export default nextConfig;
