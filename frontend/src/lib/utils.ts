import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { statusKey } from "@vision/shared";

export { fmt, formatDate, formatDateTime, estimateLsuPerHa, grazingDays, herdSummary, herdTotal, metricTone, needsAttention, latestAssessment, sortByNewest, ASK_SUGGESTIONS, METRICS, ROUND_LABEL } from "@vision/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STATUS_CLASSES = {
  good: { dot: "bg-status-good", text: "text-status-good", bg: "bg-veld-50", ring: "ring-veld-200" },
  watch: { dot: "bg-status-watch", text: "text-status-watch", bg: "bg-amber-50", ring: "ring-amber-200" },
  concern: { dot: "bg-status-concern", text: "text-status-concern", bg: "bg-red-50", ring: "ring-red-200" },
  unknown: { dot: "bg-status-unknown", text: "text-status-unknown", bg: "bg-sand-100", ring: "ring-sand-200" },
} as const;

export function statusColor(status?: string | null) {
  return STATUS_CLASSES[statusKey(status)];
}
