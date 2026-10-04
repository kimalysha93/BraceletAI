import type { Metadata } from "next";
import PatternView from "@/components/PatternView";

export const metadata: Metadata = { title: "Pattern" };

export default async function PatternPage({ params }: PageProps<"/pattern/[id]">) {
  const { id } = await params;
  return <PatternView id={id} />;
}
