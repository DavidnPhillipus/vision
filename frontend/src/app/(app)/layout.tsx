"use client";

import { RequireAuth } from "@/components/auth/auth-provider";
import { FarmProvider } from "@/components/providers";
import { NetworkProvider } from "@/components/network-provider";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <NetworkProvider>
        <FarmProvider>
          <AppShell>{children}</AppShell>
        </FarmProvider>
      </NetworkProvider>
    </RequireAuth>
  );
}
