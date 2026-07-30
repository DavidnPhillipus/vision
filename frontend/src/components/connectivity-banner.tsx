"use client";

import { WifiOff, CloudOff, Loader2 } from "lucide-react";
import { useNetwork } from "@/components/network-provider";

export function ConnectivityBanner() {
  const { online, slow, fromCache, cacheAgeLabel, pendingCount } = useNetwork();

  if (online && !slow && !fromCache && pendingCount === 0) return null;

  let icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  let message = "Connection is slow — still loading…";
  let tone = "bg-amber-50 text-amber-900 ring-amber-200";

  if (!online) {
    icon = <WifiOff className="h-3.5 w-3.5" />;
    message = fromCache
      ? `You're offline. Showing saved farm data${cacheAgeLabel ? ` (updated ${cacheAgeLabel})` : ""}. Ask / Assess need a connection.`
      : "You're offline. Reconnect to load your camps. Ask / Assess need a connection.";
    tone = "bg-sand-100 text-veld-800 ring-sand-300";
  } else if (fromCache && !slow) {
    icon = <CloudOff className="h-3.5 w-3.5" />;
    message = `Showing saved data${cacheAgeLabel ? ` from ${cacheAgeLabel}` : ""} while we refresh.`;
    tone = "bg-veld-50 text-veld-800 ring-veld-200";
  } else if (pendingCount > 0 && online) {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    message = `Syncing ${pendingCount} saved change${pendingCount === 1 ? "" : "s"}…`;
    tone = "bg-veld-50 text-veld-800 ring-veld-200";
  }

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium ring-1 ring-inset sm:text-sm ${tone}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
