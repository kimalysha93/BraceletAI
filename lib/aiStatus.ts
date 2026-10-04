"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AiStatus } from "./apiTypes";

// One shared poller for the header dot and the Describe panel.
let status: AiStatus | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit(next: AiStatus) {
  status = next;
  listeners.forEach((l) => l());
}

const OFFLINE: AiStatus = { connected: false, modelAvailable: false, model: "", warm: false };

export async function refreshAiStatus(method: "GET" | "POST" = "GET") {
  try {
    const res = await fetch("/api/status", { method, cache: "no-store" });
    emit(res.ok ? ((await res.json()) as AiStatus) : OFFLINE);
  } catch {
    emit(OFFLINE);
  }
  return status;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => void refreshAiStatus(), 20_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useAiStatus(): AiStatus | null {
  const s = useSyncExternalStore(
    subscribe,
    () => status,
    () => null,
  );
  useEffect(() => {
    if (!status) void refreshAiStatus();
  }, []);
  return s;
}

export function aiIsReady(s: AiStatus | null) {
  return !!s && s.connected && s.modelAvailable;
}
