"use client";

import * as React from "react";
import {
  cacheKeyFor,
  enqueueMutation,
  formatCacheAge,
  newMutationId,
  readCache,
  readQueue,
  writeCache,
  writeQueue,
  type QueuedMutation,
} from "@vision/shared";
import { api, getApiToken, setSlowNetworkHint } from "@/lib/api";
import { webCacheStore } from "@/lib/offline-store";
import { useAuth } from "@/components/auth/auth-provider";

type NetworkState = {
  online: boolean;
  slow: boolean;
  fromCache: boolean;
  cacheAgeLabel: string | null;
  pendingCount: number;
  setCacheMeta: (fromCache: boolean, savedAt?: number | null) => void;
  refreshPending: () => Promise<void>;
  flushQueue: () => Promise<void>;
  queueCreateCamp: (
    payload: Record<string, unknown> & { farm_id: number },
  ) => Promise<{ queued: true } | Awaited<ReturnType<typeof api.createCamp>>>;
  queueUpdateCamp: (
    campId: number,
    payload: Record<string, unknown>,
  ) => Promise<{ queued: true } | Awaited<ReturnType<typeof api.updateCamp>>>;
};

const NetworkContext = React.createContext<NetworkState | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = React.useState(true);
  const [slow, setSlow] = React.useState(false);
  const [fromCache, setFromCache] = React.useState(false);
  const [cacheAgeLabel, setCacheAgeLabel] = React.useState<string | null>(null);
  const [pendingCount, setPendingCount] = React.useState(0);

  React.useEffect(() => {
    setSlowNetworkHint(setSlow);
    return () => setSlowNetworkHint(null);
  }, []);

  React.useEffect(() => {
    const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const setCacheMeta = React.useCallback((cached: boolean, savedAt?: number | null) => {
    setFromCache(cached);
    setCacheAgeLabel(cached && savedAt ? formatCacheAge(savedAt) : null);
  }, []);

  const refreshPending = React.useCallback(async () => {
    const q = await readQueue(webCacheStore);
    setPendingCount(q.length);
  }, []);

  React.useEffect(() => {
    void refreshPending();
  }, [refreshPending, user?.id]);

  const flushQueue = React.useCallback(async () => {
    if (!getApiToken()) return;
    const queue = await readQueue(webCacheStore);
    if (!queue.length) return;
    const remaining: QueuedMutation[] = [];
    for (const item of queue) {
      try {
        if (item.type === "createCamp") {
          await api.createCamp(item.payload as Parameters<typeof api.createCamp>[0]);
        } else {
          await api.updateCamp(item.campId, item.payload as Parameters<typeof api.updateCamp>[1]);
        }
      } catch {
        remaining.push(item);
      }
    }
    await writeQueue(webCacheStore, remaining);
    setPendingCount(remaining.length);
  }, []);

  React.useEffect(() => {
    if (online) void flushQueue();
  }, [online, flushQueue]);

  const queueCreateCamp = React.useCallback(
    async (payload: Record<string, unknown> & { farm_id: number }) => {
      if (online) {
        try {
          return await api.createCamp(payload as Parameters<typeof api.createCamp>[0]);
        } catch (e) {
          if (typeof navigator !== "undefined" && navigator.onLine) throw e;
        }
      }
      await enqueueMutation(webCacheStore, {
        id: newMutationId(),
        type: "createCamp",
        payload,
        createdAt: Date.now(),
      });
      await refreshPending();
      return { queued: true as const };
    },
    [online, refreshPending],
  );

  const queueUpdateCamp = React.useCallback(
    async (campId: number, payload: Record<string, unknown>) => {
      if (online) {
        try {
          return await api.updateCamp(campId, payload as Parameters<typeof api.updateCamp>[1]);
        } catch (e) {
          if (typeof navigator !== "undefined" && navigator.onLine) throw e;
        }
      }
      await enqueueMutation(webCacheStore, {
        id: newMutationId(),
        type: "updateCamp",
        campId,
        payload,
        createdAt: Date.now(),
      });
      try {
        const key = cacheKeyFor(user?.id, `/api/camps/${campId}`);
        const hit = await readCache<Record<string, unknown>>(webCacheStore, key);
        if (hit) await writeCache(webCacheStore, key, { ...hit.data, ...payload });
      } catch {
        /* ignore */
      }
      await refreshPending();
      return { queued: true as const };
    },
    [online, refreshPending, user?.id],
  );

  const value = React.useMemo(
    () => ({
      online,
      slow,
      fromCache,
      cacheAgeLabel,
      pendingCount,
      setCacheMeta,
      refreshPending,
      flushQueue,
      queueCreateCamp,
      queueUpdateCamp,
    }),
    [
      online,
      slow,
      fromCache,
      cacheAgeLabel,
      pendingCount,
      setCacheMeta,
      refreshPending,
      flushQueue,
      queueCreateCamp,
      queueUpdateCamp,
    ],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = React.useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
