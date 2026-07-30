"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { fmt } from "@/lib/utils";
import type { CampSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CampCard({
  camp,
  href,
  selected,
  onClick,
}: {
  camp: CampSummary;
  href?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-veld-800">{camp.name}</p>
          {camp.region ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-veld-600/70">
              <MapPin className="h-3.5 w-3.5" />
              {camp.region}
            </p>
          ) : null}
        </div>
        <StatusBadge status={camp.latest_status} size="sm" />
      </div>
      <p className="mt-3 text-sm text-veld-700/80">
        {fmt(camp.area_ha, 0)} ha · {camp.cattle_count} cattle · {camp.goat_count} goats · {camp.sheep_count} sheep
      </p>
      {href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-veld-700">
          Open camp <ArrowRight className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "block rounded-2xl border px-4 py-4 text-left transition-all",
    selected
      ? "border-veld-600 bg-veld-50 shadow-sm"
      : "border-sand-200/80 bg-white/80 hover:border-veld-300 hover:bg-veld-50/40 hover:shadow-sm",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(className, "w-full")}>
      {body}
    </button>
  );
}

export function MetricBar({
  label,
  value,
  max,
  tone = "veld",
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  tone?: "veld" | "amber" | "concern";
}) {
  const v = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  const bar =
    tone === "concern" ? "bg-status-concern" : tone === "amber" ? "bg-status-watch" : "bg-veld-600";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-veld-700/80">{label}</span>
        <span className="font-semibold text-veld-800">{value == null ? "—" : fmt(value, value < 1 ? 3 : 1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand-200">
        <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
