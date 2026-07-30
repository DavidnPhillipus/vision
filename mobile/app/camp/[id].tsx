import {
  estimateLsuPerHa,
  fmt,
  formatDateTime,
  grazingDays,
  metricTone,
  METRICS,
  sortByNewest,
  type Assessment,
  type Camp,
  type Photo,
  type Weather,
} from "@vision/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AssessmentView } from "../../src/components/AssessmentView";
import { MetricBar } from "../../src/components/CampCard";
import { PhotoGallery, ReferenceTrend } from "../../src/components/CampExtras";
import { StatusBadge } from "../../src/components/StatusBadge";
import { UseMyLocationButton } from "../../src/components/UseMyLocationButton";
import {
  Button,
  Card,
  CardTitle,
  ErrorState,
  ErrorText,
  Field,
  Label,
  Loading,
  PageHeader,
  ScreenScroll,
  TextArea,
  Toggle,
} from "../../src/components/ui";
import { useFarm } from "../../src/context/FarmContext";
import { useNetwork } from "../../src/context/NetworkContext";
import { api } from "../../src/lib/api";
import { fontFamily, palette, radii } from "../../src/lib/theme";

const TABS = ["Advice", "Camp", "History"] as const;
type Tab = (typeof TABS)[number];

export default function CampDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const campId = Number(id);
  const { refresh: refreshFarm } = useFarm();
  const { queueUpdateCamp } = useNetwork();

  const [tab, setTab] = useState<Tab>("Advice");
  const [camp, setCamp] = useState<Camp | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shown, setShown] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<Camp>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campId) return;
    setLoading(true);
    setError(null);
    try {
      const [c, w, a, p] = await Promise.all([
        api.camp(campId),
        api.campWeather(campId).catch(() => null),
        api.campAssessments(campId).catch(() => [] as Assessment[]),
        api.campPhotos(campId).catch(() => [] as Photo[]),
      ]);
      setCamp(c);
      setDraft(c);
      setWeather(w);
      setPhotos(p);
      const sorted = sortByNewest(a);
      setAssessments(sorted);
      setShown(sorted[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load camp");
    } finally {
      setLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCamp() {
    if (!camp) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: draft.name,
        region: draft.region,
        area_ha: draft.area_ha,
        latitude: draft.latitude,
        longitude: draft.longitude,
        cattle_count: draft.cattle_count,
        goat_count: draft.goat_count,
        sheep_count: draft.sheep_count,
        grazing_start_date: draft.grazing_start_date,
        rotational_grazing: draft.rotational_grazing,
        observations: draft.observations,
      };
      const result = await queueUpdateCamp(camp.id, payload);
      if ("queued" in result && result.queued) {
        const next = { ...camp, ...payload } as Camp;
        setCamp(next);
        setDraft(next);
        setSaveError("Saved on this phone — will sync when you're back online.");
      } else {
        const updated = result as Camp;
        setCamp(updated);
        setDraft(updated);
        await refreshFarm();
        api.campWeather(camp.id).then(setWeather).catch(() => undefined);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading camp…" />;
  if (error || !camp)
    return (
      <ScreenScroll>
        <ErrorState message={error || "Camp not found"} onRetry={load} />
      </ScreenScroll>
    );

  const lsu = estimateLsuPerHa(camp);
  const days = grazingDays(camp.grazing_start_date);
  const rain30 = weather?.rainfall_30d_mm ?? null;
  const ref0 = shown?.references?.[0];

  return (
    <ScreenScroll>
      <PageHeader
        title={camp.name}
        subtitle={[camp.region || "Namibia", camp.area_ha != null ? `${fmt(camp.area_ha, 0)} ha` : null, days != null ? `${days} days grazing` : null]
          .filter(Boolean)
          .join(" · ")}
        onBack={() => router.back()}
        right={<StatusBadge status={assessments[0]?.status} size="sm" />}
      />

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "Advice" ? (
        <>
          <Card>
            <CardTitle>Pressure right now</CardTitle>
            <MetricBar label={METRICS.lsuPerHa.label} value={lsu} max={METRICS.lsuPerHa.max} tone={metricTone("lsuPerHa", lsu)} digits={3} />
            <MetricBar label={METRICS.grazingDays.label} value={days} max={METRICS.grazingDays.max} tone={metricTone("grazingDays", days)} digits={0} />
            <MetricBar label={METRICS.rain30d.label} value={rain30} max={METRICS.rain30d.max} tone={metricTone("rain30d", rain30)} />
          </Card>

          {shown ? (
            <>
              <AssessmentView a={shown} />
              {ref0?.plot_name ? <ReferenceTrend plotName={ref0.plot_name} siteName={ref0.site_name} /> : null}
            </>
          ) : (
            <Card>
              <CardTitle>No assessment yet</CardTitle>
              <Text style={styles.body}>Run one to get a status, evidence and next steps for this camp.</Text>
            </Card>
          )}

          <PhotoGallery photos={photos} />

          <Button
            title="Run new assessment"
            icon="sparkles-outline"
            onPress={() => router.push({ pathname: "/(tabs)/assess", params: { camp: String(camp.id) } })}
          />
          <Button
            title="Ask about this camp"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/ask",
                params: { camp: String(camp.id), ask: `Advise me on camp ${camp.name}` },
              })
            }
          />
        </>
      ) : null}

      {tab === "Camp" ? (
        <>
          <Card>
            <CardTitle>Camp details</CardTitle>
            <Label>Name</Label>
            <Field value={draft.name ?? ""} onChangeText={(v) => setDraft({ ...draft, name: v })} />
            <Label>Region</Label>
            <Field value={draft.region ?? ""} onChangeText={(v) => setDraft({ ...draft, region: v })} />
            <Label>Area (ha)</Label>
            <Field
              value={draft.area_ha != null ? String(draft.area_ha) : ""}
              keyboardType="decimal-pad"
              onChangeText={(v) => setDraft({ ...draft, area_ha: v ? Number(v) : null })}
            />
            <View style={styles.row}>
              <View style={styles.col}>
                <Label>Latitude</Label>
                <Field
                  value={draft.latitude != null ? String(draft.latitude) : ""}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(v) => setDraft({ ...draft, latitude: v ? Number(v) : null })}
                />
              </View>
              <View style={styles.col}>
                <Label>Longitude</Label>
                <Field
                  value={draft.longitude != null ? String(draft.longitude) : ""}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(v) => setDraft({ ...draft, longitude: v ? Number(v) : null })}
                />
              </View>
            </View>
            <UseMyLocationButton
              onLocated={(lat, lon) => setDraft((d) => ({ ...d, latitude: lat, longitude: lon }))}
            />
          </Card>

          <Card>
            <CardTitle>Herd</CardTitle>
            <Label>Cattle</Label>
            <Field
              value={String(draft.cattle_count ?? 0)}
              keyboardType="number-pad"
              onChangeText={(v) => setDraft({ ...draft, cattle_count: Number(v.replace(/\D/g, "")) || 0 })}
            />
            <Label>Goats</Label>
            <Field
              value={String(draft.goat_count ?? 0)}
              keyboardType="number-pad"
              onChangeText={(v) => setDraft({ ...draft, goat_count: Number(v.replace(/\D/g, "")) || 0 })}
            />
            <Label>Sheep</Label>
            <Field
              value={String(draft.sheep_count ?? 0)}
              keyboardType="number-pad"
              onChangeText={(v) => setDraft({ ...draft, sheep_count: Number(v.replace(/\D/g, "")) || 0 })}
            />
            <Label>Grazing start date</Label>
            <Field
              value={draft.grazing_start_date ? String(draft.grazing_start_date).slice(0, 10) : ""}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              onChangeText={(v) => setDraft({ ...draft, grazing_start_date: v || null })}
            />
            <Toggle
              label="Part of a rotational grazing plan"
              value={Boolean(draft.rotational_grazing)}
              onChange={(v) => setDraft({ ...draft, rotational_grazing: v })}
            />
          </Card>

          <Card>
            <CardTitle>Observations</CardTitle>
            <TextArea
              value={draft.observations ?? ""}
              onChangeText={(v) => setDraft({ ...draft, observations: v })}
              placeholder="What does the veld look like?"
            />
          </Card>

          {weather ? (
            <Card>
              <CardTitle>Weather</CardTitle>
              {weather.available ? (
                <Text style={styles.body}>
                  Rain 7d {fmt(weather.rainfall_7d_mm)} mm · 30d {fmt(weather.rainfall_30d_mm)} mm · forecast 7d{" "}
                  {fmt(weather.rainfall_forecast_7d_mm)} mm
                </Text>
              ) : (
                <Text style={styles.body}>{weather.note || "Weather is unavailable for this camp."}</Text>
              )}
            </Card>
          ) : null}

          <PhotoGallery photos={photos} />

          <ErrorText>{saveError}</ErrorText>
          <Button title="Save changes" onPress={saveCamp} loading={saving} />
        </>
      ) : null}

      {tab === "History" ? (
        assessments.length === 0 ? (
          <Card>
            <CardTitle>No history yet</CardTitle>
            <Text style={styles.body}>Assessments you run for this camp will be listed here.</Text>
          </Card>
        ) : (
          assessments.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => {
                setShown(a);
                setTab("Advice");
              }}
            >
              <Card>
                <View style={styles.historyHead}>
                  <StatusBadge status={a.status} size="sm" />
                  <Text style={styles.historyDate}>{formatDateTime(a.created_at)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={3}>
                  {a.direct_answer || a.recommendation}
                </Text>
              </Card>
            </Pressable>
          ))
        )
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: palette.sand[100],
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: palette.white,
  },
  tabText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: palette.veld[600],
  },
  tabTextActive: {
    fontFamily: fontFamily.bodyBold,
    color: palette.veld[800],
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyDate: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.75,
  },
});
