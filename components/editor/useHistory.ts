"use client";

import { useCallback, useRef, useState } from "react";
import { HISTORY_LIMIT } from "@/lib/constants";
import type { Grid } from "@/lib/grid";

type State = { present: Grid; past: Grid[]; future: Grid[] };

/** Undo/redo for the grid. A paint stroke counts as one step. */
export function useHistory(initial: () => Grid) {
  const [state, setState] = useState<State>(() => ({ present: initial(), past: [], future: [] }));
  const strokeBase = useRef<Grid | null>(null);

  const commit = useCallback((next: Grid | ((g: Grid) => Grid)) => {
    setState((s) => {
      const n = typeof next === "function" ? next(s.present) : next;
      if (n === s.present) return s;
      return { present: n, past: [...s.past, s.present].slice(-HISTORY_LIMIT), future: [] };
    });
  }, []);

  const beginStroke = useCallback(() => {
    setState((s) => {
      strokeBase.current = s.present;
      return s;
    });
  }, []);

  /** Change the grid mid-stroke without adding history steps. */
  const strokeUpdate = useCallback((fn: (g: Grid) => Grid) => {
    setState((s) => {
      const n = fn(s.present);
      return n === s.present ? s : { ...s, present: n };
    });
  }, []);

  const endStroke = useCallback(() => {
    // Read the ref outside the updater: updaters must stay pure (StrictMode runs them twice).
    const base = strokeBase.current;
    strokeBase.current = null;
    setState((s) => {
      if (!base || base === s.present) return s;
      return { present: s.present, past: [...s.past, base].slice(-HISTORY_LIMIT), future: [] };
    });
  }, []);

  /** Start fresh (e.g. when opening a remix) with no undo steps. */
  const reset = useCallback((grid: Grid) => {
    setState({ present: grid, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.past.length) return s;
      return { present: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (!s.future.length) return s;
      return { present: s.future[0], past: [...s.past, s.present], future: s.future.slice(1) };
    });
  }, []);

  return {
    grid: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    reset,
    beginStroke,
    strokeUpdate,
    endStroke,
    undo,
    redo,
  };
}
