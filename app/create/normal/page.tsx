import type { Metadata } from "next";
import { Suspense } from "react";
import NormalEditorLoader from "@/components/normal/NormalEditorLoader";

export const metadata: Metadata = { title: "Create a traditional pattern" };

export default function NormalCreatePage() {
  // The editor reads search params (remix, new, mode), which needs a Suspense boundary in a static build.
  return (
    <Suspense>
      <NormalEditorLoader />
    </Suspense>
  );
}
