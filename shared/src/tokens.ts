/**
 * Vision design tokens — the single source of truth for both the Next.js
 * website and the Expo mobile app. Tailwind reads the palette from here and
 * React Native styles consume the same hex values.
 */

export const palette = {
  sand: {
    50: "#faf7f1",
    100: "#f3ecdf",
    200: "#e7d9bf",
    300: "#d8c199",
    400: "#c7a670",
  },
  veld: {
    50: "#eef4ee",
    100: "#d6e6d8",
    200: "#a9cbae",
    300: "#7dab86",
    400: "#4e8558",
    500: "#3d6f47",
    600: "#2f5d3a",
    700: "#254b30",
    800: "#1d3b26",
    900: "#152b1c",
  },
  clay: {
    400: "#c17a4a",
    500: "#a9633a",
    600: "#8a4e2c",
  },
  status: {
    good: "#2f7d4f",
    watch: "#c9922b",
    concern: "#b5432c",
    unknown: "#6b7280",
  },
  amber: {
    50: "#fffbeb",
    200: "#fde68a",
  },
  red: {
    50: "#fef2f2",
    200: "#fecaca",
  },
  white: "#ffffff",
} as const;

/** Flat aliases used by the mobile StyleSheets. */
export const colors = {
  page: "#f7f3ea",
  surface: palette.white,
  surfaceMuted: palette.sand[50],
  card: palette.white,
  border: palette.sand[200],
  borderStrong: palette.sand[300],

  ink: palette.veld[800],
  inkStrong: palette.veld[900],
  muted: palette.veld[700],
  subtle: palette.veld[600],

  primary: palette.veld[600],
  primaryDark: palette.veld[800],
  primarySoft: palette.veld[50],
  accent: palette.clay[500],

  good: palette.status.good,
  watch: palette.status.watch,
  concern: palette.status.concern,
  unknown: palette.status.unknown,

  sand: palette.sand[100],
  sandDeep: palette.sand[200],
  white: palette.white,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fonts = {
  display: "IBM Plex Serif",
  body: "IBM Plex Sans",
} as const;

export const typography = {
  hero: { size: 34, weight: "800" as const, lineHeight: 40 },
  title: { size: 26, weight: "800" as const, lineHeight: 32 },
  section: { size: 18, weight: "700" as const, lineHeight: 24 },
  body: { size: 15, weight: "400" as const, lineHeight: 22 },
  small: { size: 13, weight: "500" as const, lineHeight: 18 },
  label: { size: 11, weight: "700" as const, lineHeight: 14 },
} as const;
