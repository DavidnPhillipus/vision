"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, TriangleAlert, CloudRain, ClipboardCheck, GitCompare } from "lucide-react";
import { useFarm } from "@/components/providers";
import { StatusBadge } from "@/components/status-badge";
import { Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { CampCard } from "@/components/camp-card";
import { CardStat } from "@/components/ui/card";
import { api, type Assessment, type Weather } from "@/lib/api";
import { fmt } from "@/lib/utils";

export default function CampsPage() {
  const { farm, camps, loading, error, refresh } = useFarm();
  const [latest, setLatest] = React.useState<Assessment | null>(null);
  const [weather, setWeather] = React.useState<Weather | null>(null);

  const attention = camps.filter((c) => c.latest_status === "High concern" || c.latest_status === "Watch");

  React.useEffect(() => {
    if (camps.length === 0) return;
    (async () => {
      try {
        const all = await Promise.all(camps.map((c) => api.campAssessments(c.id)));
        const flat = all.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setLatest(flat[0] ?? null);
        if (flat[0]?.weather_snapshot?.available) setWeather(flat[0].weather_snapshot as Weather);
        else if (camps[0]) {
          try {
            setWeather(await api.campWeather(camps[0].id));
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [camps]);

  if (loading) return <Loading label="Loading camps…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!farm) return <ErrorState message="No farm found." onRetry={refresh} />;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-veld-600/65">{farm.name}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-veld-900 md:text-4xl">
            Camps
          </h1>
          <p className="mt-2 max-w-2xl text-veld-700/70">
            Manage paddocks, check who needs attention, and jump into an assessment or comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assess">
            <Button variant="outline">
              <ClipboardCheck className="h-4 w-4" /> Assess
            </Button>
          </Link>
          <Link href="/compare">
            <Button variant="outline">
              <GitCompare className="h-4 w-4" /> Compare
            </Button>
          </Link>
          <Link href="/camps/new">
            <Button>
              <PlusCircle className="h-4 w-4" /> Add camp
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-sand-200/80">
          <CardStat label="Total camps" value={camps.length} sub="On this farm" />
        </div>
        <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-sand-200/80">
          <CardStat
            label="Needing attention"
            value={attention.length}
            sub={attention.length ? attention.map((c) => c.name).join(", ") : "All camps look stable"}
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-sand-200/80">
          <div className="flex items-start justify-between">
            <CardStat
              label="Rain last 7 days"
              value={weather?.available ? `${fmt(weather.rainfall_7d_mm)} mm` : "—"}
              sub={
                weather?.available
                  ? `${fmt(weather.rainfall_30d_mm)} mm in 30 days`
                  : "Live weather unavailable"
              }
            />
            <CloudRain className="h-5 w-5 text-veld-600/40" />
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-sand-200/80">
          <CardStat
            label="Latest assessment"
            value={latest ? <StatusBadge status={latest.status} size="sm" /> : "—"}
            sub={latest ? new Date(latest.created_at).toLocaleDateString() : "No assessments yet"}
          />
        </div>
      </div>

      {attention.length > 0 ? (
        <section className="rounded-2xl bg-amber-50/80 p-5 ring-1 ring-amber-200/70">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div className="w-full">
              <h2 className="font-display text-xl font-semibold text-amber-950">Needs attention</h2>
              <p className="mt-1 text-sm text-amber-900/75">Start with these camps first.</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {attention.map((c) => (
                  <Link
                    key={c.id}
                    href={`/camps/${c.id}`}
                    className="flex items-center justify-between rounded-xl bg-white/90 px-4 py-3 ring-1 ring-amber-200/80 hover:bg-white"
                  >
                    <span className="font-semibold text-veld-800">{c.name}</span>
                    <StatusBadge status={c.latest_status} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h2 className="font-display mb-4 text-xl font-semibold text-veld-900">All camps</h2>
          {camps.length === 0 ? (
            <Empty
              action={
                <Link href="/camps/new">
                  <Button>Add your first camp</Button>
                </Link>
              }
            >
              No camps yet. Add a paddock to start assessing grazing.
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {camps.map((c) => (
                <CampCard key={c.id} camp={c} href={`/camps/${c.id}`} />
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-2xl bg-white/80 p-5 ring-1 ring-sand-200/80">
          <h2 className="font-display text-xl font-semibold text-veld-900">Recent activity</h2>
          {latest ? (
            <div className="mt-4 space-y-3">
              <StatusBadge status={latest.status} size="sm" />
              <p className="text-base leading-relaxed text-veld-800">{latest.recommendation}</p>
              <p className="text-xs text-veld-600/60">{new Date(latest.created_at).toLocaleString()}</p>
              <div className="flex flex-wrap gap-3 pt-1 text-sm font-medium">
                <Link href={`/camps/${latest.camp_id}`} className="text-veld-700 underline">
                  View camp
                </Link>
                <Link href={`/advisor?camp=${latest.camp_id}`} className="text-veld-700 underline">
                  Ask follow-up
                </Link>
                <Link href={`/assess?camp=${latest.camp_id}`} className="text-veld-700 underline">
                  Re-assess
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-veld-600/70">Run an assessment to see activity here.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
