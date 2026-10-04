// localStorage can throw (private windows, blocked storage), so every access is guarded.

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const KEYS = {
  localPatterns: "abb:local-patterns",
  draft: "abb:draft",
  stringSettings: "abb:string-settings",
  knotLength: "abb:knot-length",
  author: "abb:author",
  feedback: "abb:feedback",
};
