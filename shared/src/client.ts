import type {
  Assessment,
  AssessmentBody,
  AuthResponse,
  AuthUser,
  Camp,
  CampSummary,
  ChatBody,
  ChatReply,
  CompareResult,
  Farm,
  Photo,
  PlotDetail,
  Reference,
  RegisterBody,
  Weather,
} from "./types";
import {
  cacheKeyFor,
  fetchWithTimeout,
  isCacheableGet,
  NETWORK,
  readCache,
  writeCache,
  type CacheStore,
} from "./offline";

export type ApiClientOptions = {
  /** "" on the website (Next.js proxies /api), absolute URL on mobile. */
  baseUrl?: string;
  getToken?: () => string | null;
  /** Persist GET responses for offline / slow networks. */
  cache?: CacheStore;
  /** Scope cache keys per signed-in user. */
  getUserId?: () => string | number | null;
  /** Called when a request exceeds NETWORK.slowMs (for soft UI hints). */
  onSlowRequest?: (slow: boolean) => void;
  /** Fired when a GET is served from disk/cache because the network failed. */
  onCacheFallback?: (path: string) => void;
  /** Fired after a successful network response (not a cache fallback). */
  onNetworkSuccess?: () => void;
};

function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: string }).msg) : String(d)))
      .join(". ");
  }
  return fallback;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl || "").replace(/\/$/, "");
  const getToken = options.getToken || (() => null);
  const cache = options.cache;
  const getUserId = options.getUserId || (() => null);
  const onSlowRequest = options.onSlowRequest;
  const onCacheFallback = options.onCacheFallback;
  const onNetworkSuccess = options.onNetworkSuccess;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method || "GET").toUpperCase();
    const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (!isForm && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

    const cacheable = Boolean(cache) && isCacheableGet(path, method);
    const key = cacheable ? cacheKeyFor(getUserId(), path) : null;
    const timeoutMs = method === "GET" || method === "HEAD" ? NETWORK.readTimeoutMs : NETWORK.writeTimeoutMs;

    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    if (onSlowRequest) {
      slowTimer = setTimeout(() => onSlowRequest(true), NETWORK.slowMs);
    }

    try {
      const res = await fetchWithTimeout(
        `${baseUrl}${path}`,
        { ...init, headers },
        timeoutMs,
      );
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const body = await res.json();
          detail = formatDetail(body.detail, detail);
        } catch {
          /* response had no JSON body */
        }
        throw new Error(detail);
      }
      if (res.status === 204) {
        onNetworkSuccess?.();
        return undefined as T;
      }
      const data = (await res.json()) as T;
      if (key && cache) await writeCache(cache, key, data);
      onNetworkSuccess?.();
      return data;
    } catch (err) {
      if (key && cache) {
        const hit = await readCache<T>(cache, key);
        if (hit) {
          onCacheFallback?.(path);
          return hit.data;
        }
      }
      throw err;
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      onSlowRequest?.(false);
    }
  }

  const json = (body: unknown) => JSON.stringify(body);

  return {
    request,
    photoUrl: (id: number) => `${baseUrl}/api/photos/${id}/file`,

    register: (body: RegisterBody) =>
      request<AuthResponse>("/api/auth/register", { method: "POST", body: json(body) }),
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>("/api/auth/login", { method: "POST", body: json(body) }),
    me: (token: string) =>
      request<AuthUser>("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),

    farms: () => request<Farm[]>("/api/farms"),
    createFarm: (body: Partial<Farm>) => request<Farm>("/api/farms", { method: "POST", body: json(body) }),
    farmCamps: (farmId: number) => request<CampSummary[]>(`/api/farms/${farmId}/camps`),

    camp: (id: number) => request<Camp>(`/api/camps/${id}`),
    createCamp: (body: Partial<Camp> & { farm_id: number }) =>
      request<Camp>("/api/camps", { method: "POST", body: json(body) }),
    updateCamp: (id: number, body: Partial<Camp>) =>
      request<Camp>(`/api/camps/${id}`, { method: "PATCH", body: json(body) }),
    deleteCamp: (id: number) => request<void>(`/api/camps/${id}`, { method: "DELETE" }),
    campWeather: (id: number) => request<Weather>(`/api/camps/${id}/weather`),
    campReferences: (id: number) => request<Reference[]>(`/api/camps/${id}/references`),
    campAssessments: (id: number) => request<Assessment[]>(`/api/camps/${id}/assessments`),
    campPhotos: (id: number) => request<Photo[]>(`/api/photos/camp/${id}`),

    runAssessment: (body: AssessmentBody) =>
      request<Assessment>("/api/assessments", { method: "POST", body: json(body) }),
    assessment: (id: number) => request<Assessment>(`/api/assessments/${id}`),

    chat: (body: ChatBody) => request<ChatReply>("/api/chat", { method: "POST", body: json(body) }),
    compare: (camp_ids: number[]) =>
      request<CompareResult>("/api/compare", { method: "POST", body: json({ camp_ids }) }),

    plot: (plotName: string) => request<PlotDetail>(`/api/dataset/plots/${encodeURIComponent(plotName)}`),
    ecoregions: () => request<string[]>("/api/dataset/ecoregions"),

    /** `file` is a browser File on web and a { uri, name, type } object on native. */
    uploadPhoto: (campId: number, direction: string, file: unknown) => {
      const fd = new FormData();
      fd.append("camp_id", String(campId));
      fd.append("direction", direction);
      fd.append("file", file as never);
      return request<{ id: number; camp_id: number; direction: string; filename: string }>("/api/photos", {
        method: "POST",
        body: fd,
      });
    },
  };
}

export type VisionApi = ReturnType<typeof createApiClient>;
