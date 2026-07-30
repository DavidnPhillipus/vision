"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ClipboardCheck, MessageCircleQuestion, MapPin, Pencil } from "lucide-react";
import { api, type Assessment, type Camp, type Photo, type Weather } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Loading, ErrorState, Empty } from "@/components/states";
import { AssessmentView } from "@/components/assessment-view";
import { CampMap } from "@/components/camp-map";
import { ReferenceTrendChart } from "@/components/reference-trend-chart";
import { MetricBar } from "@/components/camp-card";
import { cn, fmt, METRICS, metricTone } from "@/lib/utils";
import { useNetwork } from "@/components/network-provider";

const LocationPicker = dynamic(
  () => import("@/components/location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Loading label="Loading map…" /> },
);

function estimateLsuPerHa(camp: Camp): number | null {
  if (!camp.area_ha || camp.area_ha <= 0) return null;
  const lsu = camp.cattle_count * 1 + (camp.goat_count + camp.sheep_count) / 6;
  return lsu / camp.area_ha;
}

type Tab = "advice" | "camp" | "history";

export default function CampPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { queueUpdateCamp } = useNetwork();

  const [camp, setCamp] = React.useState<Camp | null>(null);
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [weather, setWeather] = React.useState<Weather | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("advice");
  const [editingLocation, setEditingLocation] = React.useState(false);
  const [editingHerd, setEditingHerd] = React.useState(false);
  const [pendingLoc, setPendingLoc] = React.useState<{ lat: number; lon: number } | null>(null);
  const [savingLoc, setSavingLoc] = React.useState(false);
  const [savingHerd, setSavingHerd] = React.useState(false);
  const [selectedHistory, setSelectedHistory] = React.useState<Assessment | null>(null);
  const [herdForm, setHerdForm] = React.useState({
    cattle_count: 0,
    goat_count: 0,
    sheep_count: 0,
    area_ha: "",
    grazing_start_date: "",
    observations: "",
    rotational_grazing: false,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, a, p] = await Promise.all([api.camp(id), api.campAssessments(id), api.campPhotos(id)]);
      setCamp(c);
      setAssessments(a);
      setPhotos(p);
      setHerdForm({
        cattle_count: c.cattle_count,
        goat_count: c.goat_count,
        sheep_count: c.sheep_count,
        area_ha: c.area_ha != null ? String(c.area_ha) : "",
        grazing_start_date: c.grazing_start_date || "",
        observations: c.observations || "",
        rotational_grazing: c.rotational_grazing,
      });
      if (a[0]?.weather_snapshot?.available) setWeather(a[0].weather_snapshot as Weather);
      else api.campWeather(id).then(setWeather).catch(() => undefined);
      if (!a.length) setTab("camp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load camp.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading camp…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!camp) return <Empty>Camp not found.</Empty>;

  const latest = selectedHistory ?? assessments[0] ?? null;
  const grazingDays = camp.grazing_start_date
    ? Math.max(0, Math.round((Date.now() - new Date(camp.grazing_start_date).getTime()) / 86400000))
    : null;
  const lsuPerHa = estimateLsuPerHa(camp);
  const rain30 = weather?.available ? weather.rainfall_30d_mm : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "advice", label: "Advice" },
    { id: "camp", label: "Camp" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={() => router.push("/camps")}
          className="text-sm text-veld-600/60 hover:text-veld-800"
        >
          ← Camps
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-veld-900 md:text-4xl">
                {camp.name}
              </h1>
              {assessments[0] ? <StatusBadge status={assessments[0].status} size="sm" /> : null}
            </div>
            <p className="mt-1 text-veld-600/65">
              {camp.region || "No region"}
              {grazingDays != null ? ` · ${grazingDays} days on camp` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/assess?camp=${camp.id}`)}>
              <ClipboardCheck className="h-4 w-4" /> Assess
            </Button>
            <Button variant="outline" onClick={() => router.push(`/advisor?camp=${camp.id}`)}>
              <MessageCircleQuestion className="h-4 w-4" /> Ask
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-sand-200/90">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-veld-800 text-veld-900"
                : "text-veld-600/60 hover:text-veld-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "advice" ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <MetricBar
              label={METRICS.lsuPerHa.label}
              value={lsuPerHa}
              max={METRICS.lsuPerHa.max}
              tone={metricTone("lsuPerHa", lsuPerHa)}
            />
            <MetricBar
              label={METRICS.grazingDays.label}
              value={grazingDays}
              max={METRICS.grazingDays.max}
              tone={metricTone("grazingDays", grazingDays)}
            />
            <MetricBar
              label={METRICS.rain30d.label}
              value={rain30}
              max={METRICS.rain30d.max}
              tone={metricTone("rain30d", rain30)}
            />
          </div>

          {latest ? (
            <>
              <AssessmentView a={latest} />
              {latest.references?.[0]?.plot_name ? (
                <ReferenceTrendChart
                  plotName={latest.references[0].plot_name}
                  siteName={latest.references[0].site_name}
                />
              ) : null}
            </>
          ) : (
            <Empty action={<Button onClick={() => router.push(`/assess?camp=${camp.id}`)}>Run assessment</Button>}>
              No advice yet for this camp.
            </Empty>
          )}
        </div>
      ) : null}

      {tab === "camp" ? (
        <div className="space-y-8">
          <div>
            {editingLocation ? (
              <div className="space-y-3">
                <LocationPicker
                  latitude={pendingLoc?.lat ?? camp.latitude}
                  longitude={pendingLoc?.lon ?? camp.longitude}
                  onChange={(lat, lon) => setPendingLoc({ lat, lon })}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingLocation(false);
                      setPendingLoc(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!pendingLoc || savingLoc}
                    onClick={async () => {
                      if (!pendingLoc) return;
                      setSavingLoc(true);
                      try {
                        const result = await queueUpdateCamp(camp.id, {
                          latitude: pendingLoc.lat,
                          longitude: pendingLoc.lon,
                        });
                        if ("queued" in result && result.queued) {
                          setCamp({ ...camp, latitude: pendingLoc.lat, longitude: pendingLoc.lon });
                        } else {
                          setCamp(result);
                          api.campWeather(camp.id).then(setWeather).catch(() => undefined);
                        }
                        setEditingLocation(false);
                        setPendingLoc(null);
                      } finally {
                        setSavingLoc(false);
                      }
                    }}
                  >
                    {savingLoc ? "Saving…" : "Save location"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CampMap lat={camp.latitude} lon={camp.longitude} name={camp.name} />
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-veld-700 hover:underline"
                  onClick={() => setEditingLocation(true)}
                >
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {camp.latitude == null ? "Set location" : "Update location"}
                  </span>
                </button>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-veld-900">Herd &amp; details</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-veld-700 hover:underline"
                onClick={() => setEditingHerd((v) => !v)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {editingHerd ? "Close" : "Edit"}
              </button>
            </div>

            {editingHerd ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["cattle_count", "Cattle"],
                      ["goat_count", "Goats"],
                      ["sheep_count", "Sheep"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={herdForm[key]}
                        onChange={(e) =>
                          setHerdForm((f) => ({ ...f, [key]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label">Area (ha)</label>
                  <input
                    type="number"
                    className="input"
                    value={herdForm.area_ha}
                    onChange={(e) => setHerdForm((f) => ({ ...f, area_ha: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Grazing start</label>
                  <input
                    type="date"
                    className="input"
                    value={herdForm.grazing_start_date}
                    onChange={(e) => setHerdForm((f) => ({ ...f, grazing_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Observations</label>
                  <textarea
                    className="input h-20 py-2"
                    value={herdForm.observations}
                    onChange={(e) => setHerdForm((f) => ({ ...f, observations: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-veld-700">
                  <input
                    type="checkbox"
                    checked={herdForm.rotational_grazing}
                    onChange={(e) => setHerdForm((f) => ({ ...f, rotational_grazing: e.target.checked }))}
                  />
                  Rotational grazing
                </label>
                <Button
                  disabled={savingHerd}
                  onClick={async () => {
                    setSavingHerd(true);
                    try {
                      const payload = {
                        cattle_count: herdForm.cattle_count,
                        goat_count: herdForm.goat_count,
                        sheep_count: herdForm.sheep_count,
                        area_ha: herdForm.area_ha ? Number(herdForm.area_ha) : null,
                        grazing_start_date: herdForm.grazing_start_date || null,
                        observations: herdForm.observations || null,
                        rotational_grazing: herdForm.rotational_grazing,
                      };
                      const result = await queueUpdateCamp(camp.id, payload);
                      if ("queued" in result && result.queued) {
                        setCamp({ ...camp, ...payload });
                      } else {
                        setCamp(result);
                      }
                      setEditingHerd(false);
                    } finally {
                      setSavingHerd(false);
                    }
                  }}
                >
                  {savingHerd ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-veld-800">
                <p className="text-lg">
                  {camp.cattle_count} cattle · {camp.goat_count} goats · {camp.sheep_count} sheep
                </p>
                <p className="text-sm text-veld-600/70">
                  {fmt(camp.area_ha, 0)} ha · {camp.rotational_grazing ? "Rotational" : "Continuous"} grazing
                </p>
                {weather?.available ? (
                  <p className="text-sm text-veld-600/70">
                    Rain: {fmt(weather.rainfall_7d_mm)} mm (7d) · {fmt(weather.rainfall_30d_mm)} mm (30d)
                  </p>
                ) : null}
                {camp.observations ? <p className="pt-2 text-sm leading-relaxed">{camp.observations}</p> : null}
              </div>
            )}
          </div>

          {photos.length ? (
            <div>
              <h2 className="font-display mb-3 text-xl font-semibold text-veld-900">Photos</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={api.photoUrl(p.id)}
                    alt={`${camp.name} ${p.direction}`}
                    loading="lazy"
                    className="h-28 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          {assessments.length === 0 ? (
            <Empty action={<Button onClick={() => router.push(`/assess?camp=${camp.id}`)}>Run assessment</Button>}>
              No assessments yet.
            </Empty>
          ) : (
            assessments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelectedHistory(a.id === assessments[0]?.id ? null : a);
                  setTab("advice");
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-sand-200/80 py-4 text-left transition hover:bg-white/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-veld-900">{a.recommendation || a.status}</p>
                  <p className="mt-0.5 text-sm text-veld-600/55">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={a.status} size="sm" />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
