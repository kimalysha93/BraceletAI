import type { Metadata } from "next";
import EditorLoader from "@/components/editor/EditorLoader";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return <EditorLoader />;
}
