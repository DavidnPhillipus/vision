import type { Assessment, Camp, CampSummary, Farm } from "@vision/shared";
import { cacheKeyFor, readCache, readQueue, writeCache } from "@vision/shared";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, didLastRequestHitNetwork } from "../lib/api";
import { mobileCacheStore } from "../lib/offline-store";
import { useAuth } from "./AuthContext";
import { useNetwork } from "./NetworkContext";

type FarmState = {
  farm: Farm | null;
  camps: CampSummary[];
  loading: boolean;
  error: string | null;
  /** True when the UI is driven by saved phone data. */
  offlineMode: boolean;
  refresh: () => Promise<void>;
};

const FarmContext = createContext<FarmState | null>(null);

/** Warm the cache so camp detail / history open offline later. */
async function prefetchCampDetails(userId: number, camps: CampSummary[]) {
  await Promise.all(
    camps.slice(0, 12).map(async (c) => {
      try {
        const [camp, assessments] = await Promise.all([
          api.camp(c.id),
          api.campAssessments(c.id).catch(() => [] as Assessment[]),
        ]);
        // api.camp already writes cache; assessments too — keep an extra snapshot key.
        await writeCache(mobileCacheStore, cacheKeyFor(userId, `/api/camps/${c.id}`), camp as Camp);
        await writeCache(
          mobileCacheStore,
          cacheKeyFor(userId, `/api/camps/${c.id}/assessments`),
          assessments,
        );
      } catch {
        /* offline or rate-limited — ignore */
      }
    }),
  );
}

async function mergePendingCreates(
  userId: number,
  farmId: number,
  camps: CampSummary[],
): Promise<CampSummary[]> {
  const queue = await readQueue(mobileCacheStore);
  const pending = queue.filter((q) => q.type === "createCamp" && q.payload.farm_id === farmId);
  if (!pending.length) return camps;

  const extras: CampSummary[] = pending.map((q, i) => ({
    id: -1000 - i,
    name: String(q.payload.name || "New camp"),
    region: (q.payload.region as string | null) ?? null,
    area_ha: (q.payload.area_ha as number | null) ?? null,
    cattle_count: Number(q.payload.cattle_count) || 0,
    goat_count: Number(q.payload.goat_count) || 0,
    sheep_count: Number(q.payload.sheep_count) || 0,
    latest_status: null,
    latest_confidence: null,
  }));

  // Prefer server camps; append pending that aren't already mirrored.
  const names = new Set(camps.map((c) => c.name.toLowerCase()));
  const unique = extras.filter((e) => !names.has(e.name.toLowerCase()));
  const merged = [...camps, ...unique];
  await writeCache(mobileCacheStore, cacheKeyFor(userId, `/api/farms/${farmId}/camps`), merged);
  return merged;
}

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { setCacheMeta, online, registerOnlineSync, fromCache } = useNetwork();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [camps, setCamps] = useState<CampSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const hydrateFromCache = useCallback(async () => {
    if (!user?.id) return false;
    const farmsHit = await readCache<Farm[]>(mobileCacheStore, cacheKeyFor(user.id, "/api/farms"));
    if (!farmsHit?.data?.length) return false;
    const active = farmsHit.data[0];
    let list =
      (
        await readCache<CampSummary[]>(
          mobileCacheStore,
          cacheKeyFor(user.id, `/api/farms/${active.id}/camps`),
        )
      )?.data ?? [];
    list = await mergePendingCreates(user.id, active.id, list);
    setFarm(active);
    setCamps(list);
    setCacheMeta(true, farmsHit.savedAt);
    setOfflineMode(true);
    return true;
  }, [user?.id, setCacheMeta]);

  const refresh = useCallback(async () => {
    if (!token || !user) {
      setFarm(null);
      setCamps([]);
      setLoading(false);
      setCacheMeta(false);
      setOfflineMode(false);
      return;
    }

    // 1) Always paint saved data first so the app is usable with no signal.
    setError(null);
    const hadCache = await hydrateFromCache();
    if (hadCache) {
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2) If we know we're offline, stop here — don't spin on a dead network.
    if (!online && hadCache) {
      setLoading(false);
      return;
    }

    // 3) When online (or unknown), pull fresh data and warm the cache.
    try {
      const farms = await api.farms();
      const live = didLastRequestHitNetwork();
      const active = farms[0] || null;
      setFarm(active);
      let list: CampSummary[] = active ? await api.farmCamps(active.id) : [];
      if (active && user.id) {
        list = await mergePendingCreates(user.id, active.id, list);
        // Prefetch details while online so camps open offline later.
        if (live) void prefetchCampDetails(user.id, list);
      }
      setCamps(list);
      if (live) {
        setCacheMeta(false);
        setOfflineMode(false);
      } else {
        setOfflineMode(true);
      }
      setError(null);
    } catch {
      setOfflineMode(hadCache);
      if (!hadCache) {
        setError(
          "No saved farm data on this phone yet. Connect once (Wi‑Fi or mobile data) so Vision can store your camps for offline use.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, user, hydrateFromCache, setCacheMeta, online]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // When connectivity returns, NetworkProvider calls this after flushing the queue.
  useEffect(() => {
    registerOnlineSync(async () => {
      await refresh();
    });
    return () => registerOnlineSync(null);
  }, [registerOnlineSync, refresh]);

  const value = useMemo(
    () => ({
      farm,
      camps,
      loading,
      error,
      offlineMode: offlineMode || fromCache || !online,
      refresh,
    }),
    [farm, camps, loading, error, offlineMode, fromCache, online, refresh],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within FarmProvider");
  return ctx;
}
