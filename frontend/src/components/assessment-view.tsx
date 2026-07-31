import { stripMarkdown } from "@vision/shared";
import { CheckCircle2, ListChecks, FileText, AlertCircle, FlaskConical, CloudRain } from "lucide-react";
import { StatusBadge, ConfidencePill } from "@/components/status-badge";
import { Card, CardTitle } from "@/components/ui/card";
import { AssessmentSpeak } from "@/components/assessment-speak";
import type { Assessment } from "@/lib/api";
import { fmt } from "@/lib/utils";

function List({ items }: { items: string[] }) {
  const cleaned = (items || []).map((t) => stripMarkdown(t)).filter(Boolean);
  if (!cleaned.length) return <p className="text-sm text-veld-600/60">—</p>;
  return (
    <ul className="space-y-1.5">
      {cleaned.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-veld-800">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-veld-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function AssessmentView({ a }: { a: Assessment }) {
  const w = a.weather_snapshot;
  const engine = (a.calculations?.engine as string) || "";
  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-veld-600">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={a.status} size="lg" />
          <ConfidencePill confidence={a.confidence} />
          <span className="ml-auto text-xs text-veld-600/60">
            {new Date(a.created_at).toLocaleString()}
          </span>
        </div>
        {a.direct_answer ? (
          <p className="mt-3 text-lg text-veld-800">{stripMarkdown(a.direct_answer)}</p>
        ) : null}
        {a.recommendation ? (
          <div className="mt-3 rounded-lg bg-veld-50 p-4 ring-1 ring-veld-100">
            <p className="text-sm font-semibold text-veld-600">Recommendation</p>
            <p className="mt-1 text-veld-800">{stripMarkdown(a.recommendation)}</p>
          </div>
        ) : null}
        <AssessmentSpeak answer={a.direct_answer} recommendation={a.recommendation} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Reasons
            </span>
          </CardTitle>
          <div className="mt-3">
            <List items={a.reasons} />
          </div>
        </Card>
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" /> Evidence used
            </span>
          </CardTitle>
          <div className="mt-3">
            <List items={a.evidence} />
          </div>
        </Card>
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Limitations
            </span>
          </CardTitle>
          <div className="mt-3">
            <List items={a.limitations} />
          </div>
        </Card>
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Practical next steps
            </span>
          </CardTitle>
          <div className="mt-3">
            <List items={a.next_steps} />
          </div>
        </Card>
      </div>

      {w && (w.available || w.note) ? (
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <CloudRain className="h-4 w-4" /> Weather context
            </span>
          </CardTitle>
          {w.available ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Metric label="Rain 7d" value={`${fmt(w.rainfall_7d_mm)} mm`} />
              <Metric label="Rain 30d" value={`${fmt(w.rainfall_30d_mm)} mm`} />
              <Metric label="Forecast 7d" value={`${fmt(w.rainfall_forecast_7d_mm)} mm`} />
              <Metric label="Temp now" value={w.current_temp_c != null ? `${fmt(w.current_temp_c)}°C` : "—"} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-veld-600/80">{w.note}</p>
          )}
        </Card>
      ) : null}

      {a.references?.length ? (
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Comparable research plots
            </span>
          </CardTitle>
          <p className="mt-1 text-xs text-veld-600/70">
            Historical reference data from research plots — not a direct measurement of this camp.
          </p>
          <div className="mt-3 space-y-2">
            {a.references.map((r) => (
              <div key={r.plot_name} className="rounded-lg border border-sand-200 bg-sand-50/50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-veld-800">{r.site_name || r.plot_name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-veld-600 ring-1 ring-sand-200">
                    {r.comparability}
                  </span>
                  {r.distance_km != null ? (
                    <span className="text-xs text-veld-600/70">{fmt(r.distance_km, 0)} km away</span>
                  ) : null}
                </div>
                <p className="mt-1 text-veld-700">
                  Grass cover {fmt(r.grass_cover_pct)}% · bare ground {fmt(r.bare_ground_pct)}% · woody{" "}
                  {fmt(r.woody_cover_pct)}%
                </p>
                {r.ecoregion ? <p className="text-xs text-veld-600/70">{r.ecoregion}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {a.photo_findings?.length ? (
        <Card>
          <CardTitle>Visual photo observations</CardTitle>
          <p className="mt-1 text-xs text-veld-600/70">
            Observations from photographs — they strengthen but do not replace the dataset, weather and farmer
            information.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {a.photo_findings.map((p, i) => (
              <div key={i} className="rounded-lg border border-sand-200 bg-sand-50/50 p-3 text-sm">
                <p className="font-semibold capitalize text-veld-800">{String(p.direction || "general")} view</p>
                <p className="mt-1 text-veld-700">{String(p.summary || "")}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {engine ? <p className="text-center text-xs text-veld-600/50">Generated by {engine}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sand-50 p-3 ring-1 ring-sand-200">
      <p className="text-xs text-veld-600/70">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-veld-800">{value}</p>
    </div>
  );
}
