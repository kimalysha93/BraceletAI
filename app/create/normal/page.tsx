import type { Metadata } from "next";
import NormalEditorLoader from "@/components/normal/NormalEditorLoader";

export const metadata: Metadata = { title: "Create a traditional pattern" };

export default function NormalCreatePage() {
  return <NormalEditorLoader />;
}
