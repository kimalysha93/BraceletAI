import type { Metadata } from "next";
import { Suspense } from "react";
import LibraryBrowser from "@/components/LibraryBrowser";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryBrowser />
    </Suspense>
  );
}
