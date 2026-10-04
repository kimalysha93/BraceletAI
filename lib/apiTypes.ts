import type { Recipe } from "./recipe";

export type GenerateResponse = {
  recipe: Recipe;
  raw: unknown;
  mode: "ai" | "offline";
  model?: string;
  ms: number;
  reason?: string;
};

export type AiStatus = { connected: boolean; modelAvailable: boolean; model: string; warm: boolean };
