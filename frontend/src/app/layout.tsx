import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";

const display = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vision — Rangeland & Livestock Advisor",
  description:
    "AI grazing advice for Namibian farmers. Assess camps, check rainfall, and decide when to move livestock — in plain language. Works offline with saved camp data.",
  manifest: "/manifest.webmanifest",
  themeColor: "#2f5d3a",
  appleWebApp: {
    capable: true,
    title: "Vision",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans antialiased`}>
        <AuthProvider>
          <ServiceWorkerRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
