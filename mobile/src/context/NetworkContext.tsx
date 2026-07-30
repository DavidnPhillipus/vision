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
import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "./AuthContext";
import {
  api,
  getApiToken,
  setCacheFallbackHint,
  setNetworkSuccessHint,
  setSlowNetworkHint,
} from "../lib/api";
import { mobileCacheStore } from "../lib/offline-store";

type NetworkState = {
  online: boolean;
  slow: boolean;
  fromCache: boolean;
  cacheAgeLabel: string | null;
  pendingCount: number;
  setCacheMeta: (fromCache: boolean, savedAt?: number | null) => void;
  setOnline: (online: boolean) => void;
  refreshPending: () => Promise<void>;
  flushQueue: () => Promise<void>;
  /** Re-run when connectivity returns — FarmProvider registers here. */
  registerOnlineSync: (fn: (() => Promise<void>) | null) => void;
  queueCreateCamp: (
    payload: Record<string, unknown> & { farm_id: number },
  ) => Promise<{ queued: true } | Awaited<ReturnType<typeof api.createCamp>>>;
  queueUpdateCamp: (
    campId: number,
    payload: Record<string, unknown>,
  ) => Promise<{ queued: true } | Awaited<ReturnType<typeof api.updateCamp>>>;
};

const NetworkContext = createContext<NetworkState | null>(null);

function isNetworkFailure(err: unknown): boolean {
  if (err && typeof err === "object" && "name" in err) {
    const name = String((err as { name: string }).name);
    if (name === "TimeoutError" || name === "TypeError" || name === "AbortError") return true;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("offline") ||
    msg.includes("timed out") ||
    msg.includes("connection") ||
    msg.includes("network request failed")
  );
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [slow, setSlow] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAgeLabel, setCacheAgeLabel] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const onlineSyncRef = useRef<(() => Promise<void>) | null>(null);
  const wasOffline = useRef(false);

  useEffect(() => {
    setSlowNetworkHint(setSlow);
    setCacheFallbackHint(() => {
      setOnline(false);
      setFromCache(true);
    });
    setNetworkSuccessHint(() => {
      setOnline(true);
    });
    return () => {
      setSlowNetworkHint(null);
      setCacheFallbackHint(null);
      setNetworkSuccessHint(null);
    };
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while checking — treat null as "maybe online".
      const connected = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOnline(connected);
    });
    void NetInfo.fetch().then((state) => {
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const sync = () => setOnline(navigator.onLine);
      window.addEventListener("online", sync);
      window.addEventListener("offline", sync);
      return () => {
        unsub();
        window.removeEventListener("online", sync);
        window.removeEventListener("offline", sync);
      };
    }
    return () => unsub();
  }, []);

  const setCacheMeta = useCallback((cached: boolean, savedAt?: number | null) => {
    setFromCache(cached);
    setCacheAgeLabel(cached && savedAt ? formatCacheAge(savedAt) : null);
  }, []);

  const registerOnlineSync = useCallback((fn: (() => Promise<void>) | null) => {
    onlineSyncRef.current = fn;
  }, []);

  const refreshPending = useCallback(async () => {
    const q = await readQueue(mobileCacheStore);
    setPendingCount(q.length);
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending, user?.id]);

  const flushQueue = useCallback(async () => {
    if (!getApiToken()) return;
    const queue = await readQueue(mobileCacheStore);
    if (!queue.length) {
      setPendingCount(0);
      return;
    }
    const remaining: QueuedMutation[] = [];
    for (const item of queue) {
      try {
        if (item.type === "createCamp") {
          await api.createCamp(item.payload as Parameters<typeof api.createCamp>[0]);
        } else {
          await api.updateCamp(item.campId, item.payload as Parameters<typeof api.updateCamp>[1]);
        }
        setOnline(true);
      } catch (e) {
        if (isNetworkFailure(e)) setOnline(false);
        remaining.push(item);
      }
    }
    await writeQueue(mobileCacheStore, remaining);
    setPendingCount(remaining.length);
  }, []);

  // When we come back online: flush edits, then refresh farm data from the server.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    (async () => {
      await flushQueue();
      if (wasOffline.current) {
        wasOffline.current = false;
        await onlineSyncRef.current?.();
      }
    })();
  }, [online, flushQueue]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void NetInfo.fetch().then(async (net) => {
        const connected = Boolean(net.isConnected) && net.isInternetReachable !== false;
        setOnline(connected);
        if (connected) {
          await flushQueue();
          await onlineSyncRef.current?.();
        }
      });
    });
    return () => sub.remove();
  }, [flushQueue]);

  const queueCreateCamp = useCallback(
    async (payload: Record<string, unknown> & { farm_id: number }) => {
      if (online) {
        try {
          const camp = await api.createCamp(payload as Parameters<typeof api.createCamp>[0]);
          setOnline(true);
          return camp;
        } catch (e) {
          if (!isNetworkFailure(e)) throw e;
        }
      }
      setOnline(false);
      await enqueueMutation(mobileCacheStore, {
        id: newMutationId(),
        type: "createCamp",
        payload,
        createdAt: Date.now(),
      });
      // Keep a local preview so the camps list still shows the new paddock offline.
      try {
        const key = cacheKeyFor(user?.id, `/api/farms/${payload.farm_id}/camps`);
        const hit = await readCache<Record<string, unknown>[]>(mobileCacheStore, key);
        const preview = {
          id: -Date.now(),
          name: String(payload.name || "New camp"),
          region: (payload.region as string | null) ?? null,
          area_ha: (payload.area_ha as number | null) ?? null,
          cattle_count: Number(payload.cattle_count) || 0,
          goat_count: Number(payload.goat_count) || 0,
          sheep_count: Number(payload.sheep_count) || 0,
          latest_status: null,
          latest_confidence: null,
          _pending: true,
        };
        const next = [...(hit?.data || []), preview];
        await writeCache(mobileCacheStore, key, next);
      } catch {
        /* ignore */
      }
      await refreshPending();
      return { queued: true as const };
    },
    [online, refreshPending, user?.id],
  );

  const queueUpdateCamp = useCallback(
    async (campId: number, payload: Record<string, unknown>) => {
      if (online) {
        try {
          const camp = await api.updateCamp(campId, payload as Parameters<typeof api.updateCamp>[1]);
          setOnline(true);
          return camp;
        } catch (e) {
          if (!isNetworkFailure(e)) throw e;
        }
      }
      setOnline(false);
      await enqueueMutation(mobileCacheStore, {
        id: newMutationId(),
        type: "updateCamp",
        campId,
        payload,
        createdAt: Date.now(),
      });
      try {
        const key = cacheKeyFor(user?.id, `/api/camps/${campId}`);
        const hit = await readCache<Record<string, unknown>>(mobileCacheStore, key);
        if (hit) await writeCache(mobileCacheStore, key, { ...hit.data, ...payload });
      } catch {
        /* ignore */
      }
      await refreshPending();
      return { queued: true as const };
    },
    [online, refreshPending, user?.id],
  );

  const value = useMemo(
    () => ({
      online,
      slow,
      fromCache,
      cacheAgeLabel,
      pendingCount,
      setCacheMeta,
      setOnline,
      refreshPending,
      flushQueue,
      registerOnlineSync,
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
      registerOnlineSync,
      queueCreateCamp,
      queueUpdateCamp,
    ],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
