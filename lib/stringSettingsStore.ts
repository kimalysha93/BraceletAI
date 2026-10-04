"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_STRING_SETTINGS, KNOT_LENGTH_CM } from "./stringConfig";
import type { StringSettings } from "./strings";
import { KEYS, loadLocal, removeLocal, saveLocal } from "./storage";

// Shared so the editor's summary and the full calculator always agree.
type Store = { settings: StringSettings; knotLengthCm: number | null };

const SERVER: Store = { settings: { ...DEFAULT_STRING_SETTINGS }, knotLengthCm: null };
let state: Store | null = null;
const listeners = new Set<() => void>();

function get(): Store {
  if (!state) {
    state = {
      // The custom length isn't restored: a new visit starts with the length matching the pattern.
      settings: { ...DEFAULT_STRING_SETTINGS, ...loadLocal<Partial<StringSettings>>(KEYS.stringSettings, {}), customLengthCm: undefined },
      knotLengthCm: loadLocal<number | null>(KEYS.knotLength, null),
    };
  }
  return state;
}

function set(next: Store) {
  state = next;
  listeners.forEach((l) => l());
}

export function useStringSettings() {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    get,
    () => SERVER,
  );
  const settings = useMemo(() => ({ ...s.settings, knotLengthCm: s.knotLengthCm ?? undefined }), [s]);
  return {
    settings,
    calibratedKnotLength: s.knotLengthCm,
    defaultKnotLength: KNOT_LENGTH_CM,
    update(patch: Partial<StringSettings>) {
      const settings = { ...get().settings, ...patch };
      saveLocal(KEYS.stringSettings, { ...settings, baseColor: undefined, customLengthCm: undefined });
      set({ ...get(), settings });
    },
    setKnotLength(v: number | null) {
      if (v == null) removeLocal(KEYS.knotLength);
      else saveLocal(KEYS.knotLength, v);
      set({ ...get(), knotLengthCm: v });
    },
  };
}
