"use client";

import * as React from "react";
import { cacheKeyFor, readCache, type CampSummary, type Farm } from "@vision/shared";
import { api } from "@/lib/api";
import { webCacheStore } from "@/lib/offline-store";
import { useAuth } from "@/components/auth/auth-provider";
import { useNetwork } from "@/components/network-provider";

type FarmState = {
  farm: Farm | null;
  camps: CampSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const FarmContext = React.createContext<FarmState | null>(null);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { setCacheMeta, online } = useNetwork();
  const [farm, setFarm] = React.useState<Farm | null>(null);
  const [camps, setCamps] = React.useState<CampSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const hydrateFromCache = React.useCallback(async () => {
    if (!user?.id) return false;
    const farmsHit = await readCache<Farm[]>(webCacheStore, cacheKeyFor(user.id, "/api/farms"));
    if (!farmsHit?.data?.length) return false;
    const active = farmsHit.data[0];
    setFarm(active);
    const campsHit = await readCache<CampSummary[]>(
      webCacheStore,
      cacheKeyFor(user.id, `/api/farms/${active.id}/camps`),
    );
    setCamps(campsHit?.data ?? []);
    setCacheMeta(true, farmsHit.savedAt);
    return true;
  }, [user?.id, setCacheMeta]);

  const refresh = React.useCallback(async () => {
    if (!token || !user) {
      setFarm(null);
      setCamps([]);
      setLoading(false);
      setCacheMeta(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Show last-known farm immediately while the network request is in flight.
    const hadCache = await hydrateFromCache();
    if (hadCache) setLoading(false);

    try {
      const farms = await api.farms();
      const active = farms[0] || null;
      setFarm(active);
      setCamps(active ? await api.farmCamps(active.id) : []);
      setCacheMeta(false);
      setError(null);
    } catch (e) {
      if (!hadCache) {
        setError(
          online
            ? e instanceof Error
              ? e.message
              : "Could not reach the Vision server."
            : "You're offline and no saved farm data was found on this device yet. Open Vision once online to save your camps.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, user, hydrateFromCache, setCacheMeta, online]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <FarmContext.Provider value={{ farm, camps, loading, error, refresh }}>{children}</FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = React.useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within FarmProvider");
  return ctx;
}
