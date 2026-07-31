import { createApiClient } from "@vision/shared";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { mobileCacheStore } from "./offline-store";

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

const PRODUCTION_API = "https://vision-52yf.onrender.com";

function resolveApiBase(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Standalone APK/IPA builds must not fall back to emulator/LAN URLs.
  const appOwnership = Constants.appOwnership; // "expo" in Expo Go, null in standalone
  if (appOwnership !== "expo") {
    return PRODUCTION_API;
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl || "";
  const host = hostUri.replace(/^[a-z]+:\/\//, "").split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:8000`;
  }
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://127.0.0.1:8000";
}

export const API_BASE = resolveApiBase();

let authToken: string | null = null;
let userId: number | null = null;
let slowHint: ((slow: boolean) => void) | null = null;
let cacheFallbackHint: (() => void) | null = null;
let networkSuccessHint: (() => void) | null = null;
/** True when the latest API response came from the network (not phone cache). */
let lastFromNetwork = true;

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

export function setCacheFallbackHint(fn: (() => void) | null) {
  cacheFallbackHint = fn;
}

export function setNetworkSuccessHint(fn: (() => void) | null) {
  networkSuccessHint = fn;
}

export function didLastRequestHitNetwork() {
  return lastFromNetwork;
}

export const api = createApiClient({
  baseUrl: API_BASE,
  getToken: () => authToken,
  getUserId: () => userId,
  cache: mobileCacheStore,
  onSlowRequest: (slow) => slowHint?.(slow),
  onCacheFallback: () => {
    lastFromNetwork = false;
    cacheFallbackHint?.();
  },
  onNetworkSuccess: () => {
    lastFromNetwork = true;
    networkSuccessHint?.();
  },
});
