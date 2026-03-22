const PREFIX = "dt-col-hidden:";

export function loadHiddenColumnKeys(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(PREFIX + storageKey);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
      return new Set(arr);
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

export function saveHiddenColumnKeys(storageKey: string, keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + storageKey, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}
