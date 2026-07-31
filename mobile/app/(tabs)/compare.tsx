import { fmt, forSpeech, metricTone, METRICS, stripMarkdown, type CompareResult } from "@vision/shared";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CampCard, MetricBar } from "../../src/components/CampCard";
import { StatusBadge } from "../../src/components/StatusBadge";
import {
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  ScreenScroll,
  SectionLabel,
} from "../../src/components/ui";
import { useFarm } from "../../src/context/FarmContext";
import { useNetwork } from "../../src/context/NetworkContext";
import { api } from "../../src/lib/api";
import { fontFamily, palette, radii } from "../../src/lib/theme";

type Row = Record<string, unknown>;

const TABLE_ROWS: { key: string; label: string; format: (c: Row) => string }[] = [
  { key: "area_ha", label: "Area (ha)", format: (c) => fmt(c.area_ha as number, 0) },
  { key: "cattle", label: "Cattle", format: (c) => String(c.cattle_count ?? "—") },
  { key: "goats", label: "Goats", format: (c) => String(c.goat_count ?? "—") },
  { key: "sheep", label: "Sheep", format: (c) => String(c.sheep_count ?? "—") },
  { key: "lsu", label: "LSU / ha", format: (c) => fmt(c.lsu_per_ha as number, 3) },
  { key: "days", label: "Days on camp", format: (c) => fmt(c.days_on_camp as number, 0) },
  { key: "rain", label: "Rain 30d (mm)", format: (c) => fmt(c.rainfall_30d_mm as number) },
];

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default function CompareScreen() {
  const router = useRouter();
  const { camps, loading } = useFarm();
  const { online } = useNetwork();
  const syncedCamps = camps.filter((c) => c.id > 0);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    if (syncedCamps.length >= 2 && selected.length === 0) {
      setSelected([syncedCamps[0].id, syncedCamps[1].id]);
    }
  }, [syncedCamps, selected.length]);

  function toggle(id: number) {
    if (id < 0) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function run() {
    if (!online) {
      setError("Compare needs a connection for live AI advice. You can still browse saved camps offline.");
      return;
    }
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

  if (syncedCamps.length < 2) {
    return (
      <ScreenScroll>
        <PageHeader title="Compare" subtitle="See camps side by side." />
        <Empty
          title="Add another camp"
          message="Comparison needs at least two camps on your farm."
          action={<Button title="Add a camp" onPress={() => router.push("/camp/new")} />}
        />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <PageHeader title="Compare" subtitle="Pick two or more camps to weigh grazing pressure and rainfall." />

      {!online ? (
        <ErrorState message="You're offline. Compare needs data — browse camps and past assessments meanwhile." />
      ) : null}

      {syncedCamps.map((camp) => (
        <CampCard
          key={camp.id}
          camp={camp}
          selectable
          selected={selected.includes(camp.id)}
          onPress={() => toggle(camp.id)}
        />
      ))}

      <Text style={styles.selectedHint}>{selected.length} selected · need at least 2</Text>
      <Button
        title={busy ? "Comparing…" : `Compare ${selected.length} camps`}
        onPress={run}
        loading={busy}
        disabled={selected.length < 2 || !online}
      />

      {error ? <ErrorState message={error} onRetry={run} /> : null}

      {result ? (
        <>
          <SectionLabel>Vision&apos;s conclusion</SectionLabel>
          <Card style={styles.conclusion}>
            <Text style={styles.conclusionText}>{stripMarkdown(result.conclusion)}</Text>
            <Pressable
              onPress={() => Speech.speak(forSpeech(result.conclusion), { language: "en-GB" })}
              style={styles.listen}
            >
              <Ionicons name="volume-medium-outline" size={16} color={palette.veld[600]} />
              <Text style={styles.listenText}>Listen</Text>
            </Pressable>
          </Card>

          {result.camps.map((c) => {
            const lsu = num(c.lsu_per_ha);
            const days = num(c.days_on_camp);
            const rain = num(c.rainfall_30d_mm);
            return (
              <Card key={String(c.camp_id)}>
                <View style={styles.cardHead}>
                  <Text style={styles.campName}>{String(c.name)}</Text>
                  <StatusBadge status={(c.latest_status as string) || null} size="sm" />
                </View>
                <MetricBar label={METRICS.lsuPerHa.label} value={lsu} max={METRICS.lsuPerHa.max} tone={metricTone("lsuPerHa", lsu)} digits={3} />
                <MetricBar label={METRICS.grazingDays.label} value={days} max={METRICS.grazingDays.max} tone={metricTone("grazingDays", days)} digits={0} />
                <MetricBar label={METRICS.rain30d.label} value={rain} max={METRICS.rain30d.max} tone={metricTone("rain30d", rain)} />
              </Card>
            );
          })}

          <Card>
            <CardTitle>Full comparison table</CardTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View>
                <View style={[styles.tr, styles.thead]}>
                  <Text style={[styles.th, styles.metricCol]}>Metric</Text>
                  {result.camps.map((c) => (
                    <Text key={String(c.camp_id)} style={[styles.th, styles.valueCol]} numberOfLines={1}>
                      {String(c.name)}
                    </Text>
                  ))}
                </View>
                {TABLE_ROWS.map((row) => (
                  <View key={row.key} style={styles.tr}>
                    <Text style={[styles.td, styles.metricCol, styles.tdLabel]}>{row.label}</Text>
                    {result.camps.map((c) => (
                      <Text key={`${row.key}-${String(c.camp_id)}`} style={[styles.td, styles.valueCol]}>
                        {row.format(c)}
                      </Text>
                    ))}
                  </View>
                ))}
                <View style={styles.tr}>
                  <Text style={[styles.td, styles.metricCol, styles.tdLabel]}>Latest status</Text>
                  {result.camps.map((c) => (
                    <View key={`st-${String(c.camp_id)}`} style={styles.valueCol}>
                      <StatusBadge status={(c.latest_status as string) || null} size="sm" />
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Card>
        </>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  selectedHint: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[600],
    opacity: 0.8,
    marginTop: 4,
  },
  conclusion: {
    borderLeftWidth: 4,
    borderLeftColor: palette.veld[600],
  },
  conclusionText: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 25,
    color: palette.veld[800],
  },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  listenText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: palette.veld[600],
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  campName: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: palette.veld[800],
    flexShrink: 1,
  },
  thead: {
    borderBottomWidth: 1,
    borderBottomColor: palette.sand[200],
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.sand[200],
    paddingVertical: 10,
  },
  th: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: palette.veld[800],
  },
  td: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: palette.veld[800],
  },
  tdLabel: {
    fontFamily: fontFamily.body,
    color: palette.veld[600],
  },
  metricCol: {
    width: 120,
    paddingRight: 8,
  },
  valueCol: {
    width: 110,
    paddingRight: 8,
  },
});
