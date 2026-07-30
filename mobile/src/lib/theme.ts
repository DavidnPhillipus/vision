import { colors, fonts, palette, radii, spacing, statusKey, statusTone, typography } from "@vision/shared";

export { colors, fonts, palette, radii, spacing, statusTone, typography };

export function statusColor(status?: string | null): string {
  return statusTone(status).fg;
}

export const METRIC_TONE_COLORS = {
  veld: palette.veld[600],
  amber: palette.status.watch,
  concern: palette.status.concern,
} as const;

/** Font families registered in app/_layout.tsx via expo-google-fonts. */
export const fontFamily = {
  display: "IBMPlexSerif_600SemiBold",
  displayBold: "IBMPlexSerif_700Bold",
  body: "IBMPlexSans_400Regular",
  bodyMedium: "IBMPlexSans_500Medium",
  bodySemi: "IBMPlexSans_600SemiBold",
  bodyBold: "IBMPlexSans_700Bold",
} as const;

// Re-export for callers that still import statusKey from theme.
export { statusKey };
