import { fmt, herdSummary, type CampSummary, type MetricTone } from "@vision/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { METRIC_TONE_COLORS, fontFamily, palette, radii } from "../lib/theme";
import { StatusBadge } from "./StatusBadge";

export function CampCard({
  camp,
  onPress,
  selected,
  selectable,
}: {
  camp: CampSummary;
  onPress: () => void;
  selected?: boolean;
  selectable?: boolean;
}) {
  const pending = camp.id < 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: palette.veld[600], backgroundColor: palette.veld[50] },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{camp.name}</Text>
          <Text style={styles.meta}>
            {pending ? "Saved on phone — syncs when online" : camp.region || "Region not set"}
          </Text>
        </View>
        {selectable ? (
          <View style={[styles.checkbox, selected && { backgroundColor: palette.veld[600], borderColor: palette.veld[600] }]} />
        ) : pending ? (
          <Text style={styles.pending}>Pending</Text>
        ) : (
          <StatusBadge status={camp.latest_status} size="sm" />
        )}
      </View>
      <Text style={styles.herd}>
        {fmt(camp.area_ha, 0)} ha · {herdSummary(camp)}
      </Text>
      {selectable ? (
        <View style={{ marginTop: 8 }}>
          <StatusBadge status={camp.latest_status} size="sm" />
        </View>
      ) : null}
    </Pressable>
  );
}

export function MetricBar({
  label,
  value,
  max,
  tone,
  digits = 2,
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  tone: MetricTone;
  digits?: number;
}) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value / max));
  const color = METRIC_TONE_COLORS[tone];
  return (
    <View style={styles.metric}>
      <View style={styles.metricHead}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{fmt(value, digits)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  name: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: palette.veld[800],
  },
  meta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: palette.veld[600],
    marginTop: 2,
  },
  pending: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: palette.status.watch,
    marginTop: 2,
  },
  herd: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[700],
    marginTop: 10,
    opacity: 0.9,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.sand[300],
    backgroundColor: palette.white,
  },
  metric: {
    marginTop: 12,
  },
  metricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  metricLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: palette.veld[700],
  },
  metricValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.sand[100],
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
