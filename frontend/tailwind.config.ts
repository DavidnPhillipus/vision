import type { Config } from "tailwindcss";

import { palette, radii } from "../shared/src/tokens";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: palette.sand,
        veld: palette.veld,
        clay: palette.clay,
        status: palette.status,
      },
      borderRadius: {
        sm: `${radii.sm / 16}rem`,
        md: `${radii.md / 16}rem`,
        lg: `${radii.lg / 16}rem`,
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "IBM Plex Serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
