import type { Metadata } from "next";
import { Suspense } from "react";
import EditorLoader from "@/components/editor/EditorLoader";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  // The editor reads search params (remix, new, mode), which needs a Suspense boundary in a static build.
  return (
    <Suspense>
      <EditorLoader />
    </Suspense>
  );
}
