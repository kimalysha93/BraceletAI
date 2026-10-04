import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { SEED_PATTERNS } from "../seed";
import type { AlphaPattern } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");
const PATTERNS_FILE = path.join(DATA_DIR, "patterns.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

// Serialise writes so two quick publishes can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** All library patterns. Seeds the file on first run; on read-only hosts it just returns the seeds. */
export async function readPatterns(): Promise<AlphaPattern[]> {
  const existing = await readJson<AlphaPattern[]>(PATTERNS_FILE);
  if (Array.isArray(existing)) return existing;
  try {
    await serial(() => writeJson(PATTERNS_FILE, SEED_PATTERNS));
  } catch {
    // Read-only filesystem (e.g. a hosted demo). Seeds still work.
  }
  return SEED_PATTERNS;
}

/** Returns true if saved to disk, false if the host doesn't allow writes. */
export async function addPattern(pattern: AlphaPattern): Promise<boolean> {
  return serial(async () => {
    const all = (await readJson<AlphaPattern[]>(PATTERNS_FILE)) ?? [...SEED_PATTERNS];
    all.push(pattern);
    try {
      await writeJson(PATTERNS_FILE, all);
      return true;
    } catch {
      return false;
    }
  });
}

export async function appendFeedback(entry: Record<string, unknown>): Promise<boolean> {
  return serial(async () => {
    const all = (await readJson<Record<string, unknown>[]>(FEEDBACK_FILE)) ?? [];
    all.push(entry);
    try {
      await writeJson(FEEDBACK_FILE, all.slice(-5000));
      return true;
    } catch {
      return false;
    }
  });
}
