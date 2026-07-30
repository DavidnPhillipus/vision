import { createApiClient } from "@vision/shared";
import { webCacheStore } from "@/lib/offline-store";

export type {
  Assessment,
  AuthResponse,
  AuthUser,
  Camp,
  CampSummary,
  CoverRound,
  Farm,
  Photo,
  PlotDetail,
  Reference,
  Weather,
} from "@vision/shared";

/** Shared JWT for web + mobile — same account, same farm data. */
let authToken: string | null = null;
let userId: number | null = null;
let slowHint: ((slow: boolean) => void) | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export function getApiToken() {
  return authToken;
}

export function setApiUserId(id: number | null) {
  userId = id;
}

export function setSlowNetworkHint(fn: ((slow: boolean) => void) | null) {
  slowHint = fn;
}

export const api = createApiClient({
  baseUrl: "",
  getToken: () => authToken,
  getUserId: () => userId,
  cache: webCacheStore,
  onSlowRequest: (slow) => slowHint?.(slow),
});
