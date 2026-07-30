import type { Assessment, Camp, CampSummary, PhotoDirection } from "./types";

export type StatusKey = "good" | "watch" | "concern" | "unknown";
export type MetricTone = "veld" | "amber" | "concern";

export const STATUS_LABELS = ["Good", "Watch", "High concern", "Insufficient data"] as const;

export function statusKey(status?: string | null): StatusKey {
  switch (status) {
    case "Good":
      return "good";
    case "Watch":
      return "watch";
    case "High concern":
      return "concern";
    default:
      return "unknown";
  }
}

export function statusLabel(status?: string | null): string {
  return status || "No assessment yet";
}

/** Livestock units per hectare: cattle count as 1 LSU, small stock as 1/6. */
export function estimateLsuPerHa(camp: Pick<Camp, "area_ha" | "cattle_count" | "goat_count" | "sheep_count">) {
  if (!camp.area_ha || camp.area_ha <= 0) return null;
  const lsu = camp.cattle_count * 1 + (camp.goat_count + camp.sheep_count) / 6;
  return lsu / camp.area_ha;
}

export function grazingDays(grazingStartDate?: string | null): number | null {
  if (!grazingStartDate) return null;
  return Math.max(0, Math.round((Date.now() - new Date(grazingStartDate).getTime()) / 86400000));
}

export function herdTotal(camp: Pick<Camp, "cattle_count" | "goat_count" | "sheep_count">) {
  return camp.cattle_count + camp.goat_count + camp.sheep_count;
}

export function herdSummary(camp: Pick<Camp, "cattle_count" | "goat_count" | "sheep_count">) {
  return `${camp.cattle_count} cattle · ${camp.goat_count} goats · ${camp.sheep_count} sheep`;
}

/** Shared thresholds so the website and app colour metrics identically. */
export const METRICS = {
  lsuPerHa: { max: 0.5, amber: 0.12, concern: 0.25, label: "LSU / ha", higherIsWorse: true },
  grazingDays: { max: 120, amber: 30, concern: 60, label: "Days on camp", higherIsWorse: true },
  rain30d: { max: 80, amber: 30, concern: 10, label: "Rain 30d (mm)", higherIsWorse: false },
} as const;

export type MetricName = keyof typeof METRICS;

export function metricTone(metric: MetricName, value: number | null | undefined): MetricTone {
  if (value === null || value === undefined || Number.isNaN(value)) return "veld";
  const m = METRICS[metric];
  if (m.higherIsWorse) {
    if (value > m.concern) return "concern";
    if (value > m.amber) return "amber";
    return "veld";
  }
  if (value < m.concern) return "concern";
  if (value < m.amber) return "amber";
  return "veld";
}

export function needsAttention(camp: Pick<CampSummary, "latest_status">) {
  return camp.latest_status === "High concern" || camp.latest_status === "Watch";
}

export function sortByNewest<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function latestAssessment(assessments: Assessment[]): Assessment | null {
  return sortByNewest(assessments)[0] ?? null;
}

export function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export const ASK_SUGGESTIONS = [
  "Which camp should I rest first?",
  "Should I move the herd this week?",
  "How is recent rainfall affecting grazing?",
  "Is this camp overgrazed for my herd?",
] as const;

/** Shorter home-screen prompt list (first three of ASK_SUGGESTIONS). */
export const HOME_SUGGESTIONS = ASK_SUGGESTIONS.slice(0, 3);

export const ADVISOR_GREETING =
  "Ask about stocking, resting camps, rainfall or comparing paddocks. I use your farm data, live weather and the Namibia rangeland research set.";

export const ASSESS_PROGRESS_STAGES = [
  "Reviewing camp information",
  "Checking recent rainfall",
  "Searching comparable rangeland records",
  "Reviewing optional photographs",
  "Preparing recommendation",
] as const;

export const PHOTO_DIRECTIONS: { key: PhotoDirection; label: string }[] = [
  { key: "north", label: "North" },
  { key: "east", label: "East" },
  { key: "south", label: "South" },
  { key: "west", label: "West" },
];

export const ROUND_LABEL: Record<string, string> = {
  feb_23: "Feb 2023",
  may_23: "May 2023",
  feb_24: "Feb 2024",
  april_24: "Apr 2024",
};

export const NAV_ITEMS = [
  { key: "home", label: "Home", webPath: "/dashboard", mobilePath: "/(tabs)" },
  { key: "ask", label: "Ask", webPath: "/advisor", mobilePath: "/(tabs)/ask" },
  { key: "camps", label: "Camps", webPath: "/camps", mobilePath: "/(tabs)/camps" },
  { key: "assess", label: "Assess", webPath: "/assess", mobilePath: "/(tabs)/assess" },
  { key: "compare", label: "Compare", webPath: "/compare", mobilePath: "/(tabs)/compare" },
] as const;

export const ASSESS_STEPS = ["Camp", "Herd", "Grazing", "Photos", "Review"] as const;

/** Shared status chip colours so website and app paint status the same way. */
export const STATUS_TONES = {
  good: { fg: "#2f7d4f", bg: "#eef4ee", border: "#a9cbae" },
  watch: { fg: "#c9922b", bg: "#fffbeb", border: "#fde68a" },
  concern: { fg: "#b5432c", bg: "#fef2f2", border: "#fecaca" },
  unknown: { fg: "#6b7280", bg: "#f3ecdf", border: "#e7d9bf" },
} as const;

export function statusTone(status?: string | null) {
  return STATUS_TONES[statusKey(status)];
}
