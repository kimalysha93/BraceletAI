import type { Metadata } from "next";
import { Suspense } from "react";
import PatternRoute from "@/components/PatternRoute";

export const metadata: Metadata = { title: "Pattern" };

// /pattern?id=… rather than /pattern/[id], so the page works as a single static file on GitHub Pages.
export default function PatternPage() {
  return (
    <Suspense>
      <PatternRoute />
    </Suspense>
  );
}
