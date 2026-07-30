"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Loading, Empty } from "@/components/states";

const ROUND_LABEL: Record<string, string> = {
  feb_23: "Feb 2023",
  may_23: "May 2023",
  feb_24: "Feb 2024",
  april_24: "Apr 2024",
};

export function ReferenceTrendChart({ plotName, siteName }: { plotName: string; siteName?: string | null }) {
  const [data, setData] = React.useState<{ round: string; grass: number | null; bare: number | null; woody: number | null }[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    api
      .plot(plotName)
      .then((res) => {
        if (!alive) return;
        setData(
          res.cover_rounds.map((r) => ({
            round: ROUND_LABEL[r.round] || r.round,
            grass: r.grass_cover_pct,
            bare: r.bare_ground_pct,
            woody: r.woody_cover_pct,
          })),
        );
      })
      .catch(() => setData([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [plotName]);

  return (
    <Card>
      <CardTitle>Seasonal cover trend — reference plot</CardTitle>
      <p className="mt-1 text-xs text-veld-600/70">
        Vegetation cover across collection rounds at comparable research plot{" "}
        <span className="font-medium">{siteName || plotName}</span>. Compare the same season across years (e.g. Feb 2023
        vs Feb 2024). Historical research data — not a direct measurement of this camp.
      </p>
      {loading ? (
        <Loading label="Loading trend…" />
      ) : !data || data.length < 2 ? (
        <Empty>Not enough seasonal records to chart a trend for this plot.</Empty>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7d9bf" />
              <XAxis dataKey="round" tick={{ fontSize: 12, fill: "#2f5d3a" }} />
              <YAxis tick={{ fontSize: 12, fill: "#2f5d3a" }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="grass" name="Grass cover" stroke="#2f7d4f" strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="bare" name="Bare ground" stroke="#a9633a" strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="woody" name="Woody" stroke="#c9922b" strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
