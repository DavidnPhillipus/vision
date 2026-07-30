import type { CacheStore } from "@vision/shared";

const memory = new Map<string, string>();

/** localStorage-backed cache with in-memory fallback (private browsing, quota). */
export const webCacheStore: CacheStore = {
  getItem(key) {
    try {
      return localStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota / private mode — memory still holds it for the session */
    }
  },
  removeItem(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
