"use client";

import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 text-veld-700">
        <Loader2 className="h-5 w-5 animate-spin text-veld-600" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70 ring-1 ring-sand-200/70" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-white/70 ring-1 ring-sand-200/70" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-red-50 px-5 py-5 text-status-concern ring-1 ring-red-200">
      <div className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <Button variant="outline" size="md" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 px-5 py-10 text-center ring-1 ring-sand-200/80">
      <div className="mx-auto max-w-md text-veld-700/85">{children}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
