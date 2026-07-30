import { fmt, latestAssessment, needsAttention, formatDateTime, type Assessment, type Weather } from "@vision/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CampCard } from "../../src/components/CampCard";
import { StatusBadge } from "../../src/components/StatusBadge";
import {
  Button,
  Card,
  CardStat,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  ScreenScroll,
  SectionLabel,
} from "../../src/components/ui";
import { useFarm } from "../../src/context/FarmContext";
import { api } from "../../src/lib/api";
import { fontFamily, palette, radii } from "../../src/lib/theme";

export default function CampsScreen() {
  const router = useRouter();
  const { farm, camps, loading, error, refresh } = useFarm();
  const [latest, setLatest] = useState<Assessment | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void refresh();
      if (camps.length === 0) return;
      (async () => {
        try {
          const synced = camps.filter((c) => c.id > 0);
          if (!synced.length) return;
          const all = await Promise.all(synced.map((c) => api.campAssessments(c.id)));
          const newest = latestAssessment(all.flat());
          if (!alive) return;
          setLatest(newest);
          if (newest?.weather_snapshot?.available) {
            setWeather(newest.weather_snapshot as Weather);
          } else if (synced[0]) {
            setWeather(await api.campWeather(synced[0].id).catch(() => null));
          }
        } catch {
          /* stats are optional — often fail offline without cache */
        }
      })();
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camps.length]),
  );

  if (loading) return <Loading label="Loading camps…" />;

  const attention = camps.filter(needsAttention);

  return (
    <ScreenScroll>
      <PageHeader title="Camps" subtitle={farm ? farm.name : "Your paddocks and their latest status"} />

      <View style={styles.actions}>
        <Button title="Assess" icon="clipboard-outline" size="md" variant="outline" onPress={() => router.push("/(tabs)/assess")} style={styles.action} />
        <Button title="Compare" icon="git-compare-outline" size="md" variant="outline" onPress={() => router.push("/(tabs)/compare")} style={styles.action} />
        <Button title="Add camp" icon="add-outline" size="md" onPress={() => router.push("/camp/new")} style={styles.action} />
      </View>

      {error ? <ErrorState message={error} onRetry={refresh} /> : null}

      {camps.length === 0 ? (
        <Empty
          title="No camps yet"
          message="Add your first camp to start getting grazing advice."
          action={<Button title="Add a camp" onPress={() => router.push("/camp/new")} />}
        />
      ) : (
        <>
          <View style={styles.statsRow}>
            <CardStat label="Camps" value={String(camps.length)} />
            <CardStat label="Need attention" value={String(attention.length)} hint="Watch or high concern" />
          </View>
          <View style={styles.statsRow}>
            <CardStat label="Rain 7d" value={`${fmt(weather?.rainfall_7d_mm)} mm`} />
            <CardStat label="Rain 30d" value={`${fmt(weather?.rainfall_30d_mm)} mm`} />
          </View>

          {attention.length ? (
            <>
              <SectionLabel>Needs attention</SectionLabel>
              <View style={styles.alert}>
                <Text style={styles.alertText}>
                  {attention.length} camp{attention.length > 1 ? "s" : ""} may need a rest or a herd move.
                </Text>
              </View>
              {attention.map((camp) => (
                <CampCard
                  key={camp.id}
                  camp={camp}
                  onPress={() => {
                    if (camp.id > 0) router.push(`/camp/${camp.id}`);
                  }}
                />
              ))}
            </>
          ) : null}

          <SectionLabel>All camps</SectionLabel>
          {camps.map((camp) => (
            <CampCard
              key={camp.id}
              camp={camp}
              onPress={() => {
                if (camp.id > 0) router.push(`/camp/${camp.id}`);
              }}
            />
          ))}

          {latest ? (
            <>
              <SectionLabel>Recent activity</SectionLabel>
              <Card>
                <StatusBadge status={latest.status} size="sm" />
                <Text style={styles.activityText}>{latest.recommendation}</Text>
                <Text style={styles.activityMeta}>{formatDateTime(latest.created_at)}</Text>
                <Button
                  title="Open camp"
                  variant="outline"
                  size="md"
                  onPress={() => router.push(`/camp/${latest.camp_id}`)}
                />
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  action: {
    flex: 1,
    marginTop: 0,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  alert: {
    backgroundColor: palette.amber[50],
    borderWidth: 1,
    borderColor: palette.amber[200],
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  alertText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: palette.status.watch,
  },
  activityText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
    marginTop: 10,
  },
  activityMeta: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.7,
    marginTop: 6,
  },
});
