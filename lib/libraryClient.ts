"use client";

import { useEffect, useState } from "react";
import { SEED_PATTERNS } from "./seed";
import { KEYS, loadLocal, saveLocal } from "./storage";
import type { AlphaPattern } from "./types";
import { makePatternId, validatePattern } from "./validatePattern";

// The library lives in data/patterns.json via the API. When the app is hosted somewhere
// read-only (or with no server at all), published patterns are kept in this browser instead.

function localPatterns(): AlphaPattern[] {
  return loadLocal<AlphaPattern[]>(KEYS.localPatterns, []);
}

function merge(server: AlphaPattern[], local: AlphaPattern[]) {
  const byId = new Map<string, AlphaPattern>();
  for (const p of [...server, ...local]) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchLibrary(): Promise<AlphaPattern[]> {
  let server: AlphaPattern[] = SEED_PATTERNS;
  try {
    const res = await fetch("/api/patterns", { cache: "no-store" });
    if (res.ok) server = ((await res.json()) as { patterns: AlphaPattern[] }).patterns;
  } catch {
    // offline / static host: seeds only
  }
  return merge(server, localPatterns());
}

export type PublishInput = Omit<AlphaPattern, "id" | "createdAt" | "palette">;

export async function publishPattern(input: PublishInput): Promise<{ pattern: AlphaPattern; savedTo: "library" | "browser" }> {
  try {
    const res = await fetch("/api/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { pattern?: AlphaPattern; persisted?: boolean; error?: string };
    if (!res.ok || !data.pattern) throw new PublishError(data.error ?? "Couldn't publish.");
    if (data.persisted) return { pattern: data.pattern, savedTo: "library" };
    saveLocal(KEYS.localPatterns, [...localPatterns(), data.pattern]);
    return { pattern: data.pattern, savedTo: "browser" };
  } catch (err) {
    if (err instanceof PublishError) throw err;
    // No server reachable: validate and save locally.
    const result = validatePattern(input, () => makePatternId(input.title));
    if ("error" in result) throw new PublishError(result.error);
    saveLocal(KEYS.localPatterns, [...localPatterns(), result.pattern]);
    return { pattern: result.pattern, savedTo: "browser" };
  }
}

export class PublishError extends Error {}

export function remixCount(all: AlphaPattern[], id: string) {
  return all.filter((p) => p.remixedFrom === id).length;
}

export function useLibrary() {
  const [patterns, setPatterns] = useState<AlphaPattern[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLibrary().then((p) => alive && setPatterns(p));
    return () => {
      alive = false;
    };
  }, []);
  return patterns;
}
