"use client";

import { stripMarkdown } from "@vision/shared";
import * as React from "react";
import Link from "next/link";
import { useFarm } from "@/components/providers";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState, Empty } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, SoftPanel } from "@/components/page-header";
import { MetricBar } from "@/components/camp-card";
import { AssessmentSpeak } from "@/components/assessment-speak";
import { fmt } from "@/lib/utils";

type Row = Record<string, unknown>;

export default function ComparePage() {
  const { camps, loading } = useFarm();
  const [selected, setSelected] = React.useState<number[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ camps: Row[]; conclusion: string } | null>(null);

  React.useEffect(() => {
    if (camps.length >= 2 && selected.length === 0) setSelected([camps[0].id, camps[1].id]);
  }, [camps, selected.length]);

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.compare(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Loading camps…" />;

  if (camps.length < 2) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Compare camps"
          description="You need at least two camps to compare grazing pressure and decide who rests first."
        />
        <Empty
          action={
            <Link href="/camps/new">
              <Button>Add another camp</Button>
            </Link>
          }
        >
          Add a second camp to unlock side-by-side comparison.
        </Empty>
      </div>
    );
  }

  const rows: { key: string; label: string; fmt: (r: Row) => string }[] = [
    { key: "area_ha", label: "Area (ha)", fmt: (r) => fmt(r.area_ha as number, 0) },
    { key: "cattle_count", label: "Cattle", fmt: (r) => String(r.cattle_count ?? "—") },
    { key: "goat_count", label: "Goats", fmt: (r) => String(r.goat_count ?? "—") },
    { key: "sheep_count", label: "Sheep", fmt: (r) => String(r.sheep_count ?? "—") },
    { key: "lsu_per_ha", label: "LSU per ha (est.)", fmt: (r) => fmt(r.lsu_per_ha as number, 3) },
    { key: "days_on_camp", label: "Days on camp", fmt: (r) => (r.days_on_camp != null ? String(r.days_on_camp) : "—") },
    { key: "rainfall_7d_mm", label: "Rain 7d (mm)", fmt: (r) => fmt(r.rainfall_7d_mm as number) },
    { key: "rainfall_30d_mm", label: "Rain 30d (mm)", fmt: (r) => fmt(r.rainfall_30d_mm as number) },
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Compare camps"
        description="Pick two or more paddocks. Vision ranks pressure using herd density, grazing days, rainfall, and latest status."
      />

      <SoftPanel>
        <CardTitle>Choose camps</CardTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {camps.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  on ? "border-veld-600 bg-veld-50 shadow-sm" : "border-sand-200 bg-white hover:border-veld-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-veld-800">{c.name}</p>
                  <StatusBadge status={c.latest_status} size="sm" />
                </div>
                <p className="mt-1 text-sm text-veld-600/70">
                  {fmt(c.area_ha, 0)} ha · {c.cattle_count} cattle
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={selected.length < 2 || busy} size="lg">
            {busy ? "Comparing…" : `Compare ${selected.length} camps`}
          </Button>
          <p className="text-sm text-veld-600/70">{selected.length} selected · need at least 2</p>
        </div>
      </SoftPanel>

      {error ? <ErrorState message={error} onRetry={run} /> : null}

      {result ? (
        <>
          <SoftPanel className="border-l-4 border-l-veld-600">
            <p className="text-sm font-semibold uppercase tracking-wider text-veld-600/70">Vision&apos;s conclusion</p>
            <p className="mt-2 text-xl leading-relaxed text-veld-800 md:text-2xl">
              {stripMarkdown(result.conclusion)}
            </p>
            <AssessmentSpeak answer={result.conclusion} recommendation={null} />
          </SoftPanel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {result.camps.map((c) => {
              const lsu = typeof c.lsu_per_ha === "number" ? c.lsu_per_ha : 0;
              const days = typeof c.days_on_camp === "number" ? c.days_on_camp : 0;
              const rain = typeof c.rainfall_30d_mm === "number" ? c.rainfall_30d_mm : 0;
              return (
                <Card key={String(c.camp_id)} className="rounded-2xl">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-semibold text-veld-800">{String(c.name)}</p>
                    <StatusBadge status={(c.latest_status as string) || null} size="sm" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <MetricBar label="LSU / ha" value={lsu} max={0.5} tone={lsu > 0.25 ? "concern" : lsu > 0.12 ? "amber" : "veld"} />
                    <MetricBar label="Days on camp" value={days} max={120} tone={days > 60 ? "concern" : days > 30 ? "amber" : "veld"} />
                    <MetricBar label="Rain 30d (mm)" value={rain} max={80} tone={rain < 10 ? "concern" : rain < 30 ? "amber" : "veld"} />
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-x-auto rounded-2xl">
            <CardTitle>Full comparison table</CardTitle>
            <table className="mt-4 w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="p-3 text-left text-veld-600/70">Metric</th>
                  {result.camps.map((c) => (
                    <th key={String(c.camp_id)} className="p-3 text-left font-bold text-veld-800">
                      {String(c.name)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-sand-100">
                    <td className="p-3 text-veld-600/80">{row.label}</td>
                    {result.camps.map((c) => (
                      <td key={`${row.key}-${String(c.camp_id)}`} className="p-3 font-medium text-veld-800">
                        {row.fmt(c)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-3 text-veld-600/80">Latest status</td>
                  {result.camps.map((c) => (
                    <td key={`st-${String(c.camp_id)}`} className="p-3">
                      <StatusBadge status={(c.latest_status as string) || null} size="sm" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
}
