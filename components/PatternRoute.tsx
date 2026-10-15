"use client";

import { useSearchParams } from "next/navigation";
import PatternView from "./PatternView";

export default function PatternRoute() {
  const id = useSearchParams().get("id") ?? "";
  // Keyed so moving between patterns (e.g. original ↔ remix) starts fresh.
  return <PatternView key={id} id={id} />;
}
