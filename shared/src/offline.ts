/**
 * Offline / slow-network helpers shared by the website and mobile app.
 *
 * Farmers often have weak connectivity. We cache successful reads so camps and
 * past assessments remain usable offline, queue simple camp edits, and leave
 * live AI / weather / uploads online-only with clear messaging.
 */

export type CacheStore = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
};

export type CachedEnvelope<T> = {
  savedAt: number;
  data: T;
};

export type QueuedMutation =
  | {
      id: string;
      type: "createCamp";
      payload: Record<string, unknown> & { farm_id: number };
      createdAt: number;
    }
  | {
      id: string;
      type: "updateCamp";
      campId: number;
      payload: Record<string, unknown>;
      createdAt: number;
    };

export const OFFLINE_QUEUE_KEY = "vision:offline:queue:v1";

/** Paths that should never be served from cache (live / mutating). */
const ONLINE_ONLY_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/chat",
  "/api/assessments",
  "/api/compare",
  "/api/photos",
];

export function isOnlineOnlyPath(path: string, method = "GET"): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return true;
  if (path.includes("/weather")) return true;
  return ONLINE_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p + "?"));
}

export function isCacheableGet(path: string, method = "GET"): boolean {
  return method.toUpperCase() === "GET" && !isOnlineOnlyPath(path, method);
}

export function cacheKeyFor(userId: string | number | null | undefined, path: string): string {
  const uid = userId == null || userId === "" ? "anon" : String(userId);
  return `vision:cache:v1:${uid}:${path}`;
}

export async function readCache<T>(store: CacheStore, key: string): Promise<CachedEnvelope<T> | null> {
  try {
    const raw = await store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCache<T>(store: CacheStore, key: string, data: T): Promise<void> {
  const envelope: CachedEnvelope<T> = { savedAt: Date.now(), data };
  await store.setItem(key, JSON.stringify(envelope));
}

export async function readQueue(store: CacheStore): Promise<QueuedMutation[]> {
  try {
    const raw = await store.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeQueue(store: CacheStore, queue: QueuedMutation[]): Promise<void> {
  await store.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueMutation(store: CacheStore, item: QueuedMutation): Promise<number> {
  const queue = await readQueue(store);
  queue.push(item);
  await writeQueue(store, queue);
  return queue.length;
}

export function newMutationId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatCacheAge(savedAt: number, now = Date.now()): string {
  const mins = Math.round((now - savedAt) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export class OfflineError extends Error {
  constructor(message = "You appear to be offline. Showing saved data where possible.") {
    super(message);
    this.name = "OfflineError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "The connection is very slow. Try again, or keep working with saved camps.") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Abortable timeout wrapper for fetch. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = init?.signal
      ? anySignal([init.signal, controller.signal])
      : controller.signal;
    return await fetch(input, { ...init, signal });
  } catch (e) {
    if (controller.signal.aborted) throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export const NETWORK = {
  /** Soft “still loading” hint for the banner. */
  slowMs: 2500,
  /** Abort GET-like reads after this — fall back to cache. */
  readTimeoutMs: 18000,
  /** AI / uploads get longer before we give up. */
  writeTimeoutMs: 90000,
} as const;
