import { fmt, forSpeech, formatDateTime, stripMarkdown, type Assessment } from "@vision/shared";
import * as Speech from "expo-speech";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontFamily, palette, radii } from "../lib/theme";
import { ConfidencePill, StatusBadge } from "./StatusBadge";
import { BulletList, Card, CardTitle } from "./ui";

function Section({
  icon,
  title,
  items,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  items: string[];
}) {
  const cleaned = (items || []).map((t) => stripMarkdown(t)).filter(Boolean);
  return (
    <Card>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color={palette.veld[600]} />
        <CardTitle>{title}</CardTitle>
      </View>
      {cleaned.length ? <BulletList items={cleaned} /> : <Text style={styles.dash}>—</Text>}
    </Card>
  );
}

function WeatherMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weatherMetric}>
      <Text style={styles.weatherLabel}>{label}</Text>
      <Text style={styles.weatherValue}>{value}</Text>
    </View>
  );
}

export function AssessmentView({ a }: { a: Assessment }) {
  const w = a.weather_snapshot;
  const engine = (a.calculations?.engine as string) || "";

  // Speak only the AI answer (+ recommendation) — not status badges or evidence lists.
  const spoken = [forSpeech(a.direct_answer), forSpeech(a.recommendation)].filter(Boolean).join(" ");

  return (
    <View>
      <Card style={styles.headline}>
        <View style={styles.headRow}>
          <StatusBadge status={a.status} />
          <ConfidencePill confidence={a.confidence} />
        </View>
        <Text style={styles.timestamp}>{formatDateTime(a.created_at)}</Text>

        {a.direct_answer ? <Text style={styles.answer}>{stripMarkdown(a.direct_answer)}</Text> : null}

        {a.recommendation ? (
          <View style={styles.recommendation}>
            <Text style={styles.recommendationLabel}>Recommendation</Text>
            <Text style={styles.recommendationText}>{stripMarkdown(a.recommendation)}</Text>
          </View>
        ) : null}

        {spoken ? (
          <Pressable onPress={() => Speech.speak(spoken, { language: "en-GB" })} style={styles.listen}>
            <Ionicons name="volume-medium-outline" size={16} color={palette.veld[600]} />
            <Text style={styles.listenText}>Listen to answer</Text>
          </Pressable>
        ) : null}
      </Card>

      <Section icon="list-outline" title="Reasons" items={a.reasons} />
      <Section icon="document-text-outline" title="Evidence used" items={a.evidence} />
      <Section icon="alert-circle-outline" title="Limitations" items={a.limitations} />
      <Section icon="checkmark-circle-outline" title="Practical next steps" items={a.next_steps} />

      {w && (w.available || w.note) ? (
        <Card>
          <View style={styles.sectionHead}>
            <Ionicons name="rainy-outline" size={16} color={palette.veld[600]} />
            <CardTitle>Weather context</CardTitle>
          </View>
          {w.available ? (
            <View style={styles.weatherGrid}>
              <WeatherMetric label="Rain 7d" value={`${fmt(w.rainfall_7d_mm)} mm`} />
              <WeatherMetric label="Rain 30d" value={`${fmt(w.rainfall_30d_mm)} mm`} />
              <WeatherMetric label="Forecast 7d" value={`${fmt(w.rainfall_forecast_7d_mm)} mm`} />
              <WeatherMetric
                label="Temp now"
                value={w.current_temp_c != null ? `${fmt(w.current_temp_c)}°C` : "—"}
              />
            </View>
          ) : (
            <Text style={styles.note}>{w.note}</Text>
          )}
        </Card>
      ) : null}

      {a.references?.length ? (
        <Card>
          <View style={styles.sectionHead}>
            <Ionicons name="flask-outline" size={16} color={palette.veld[600]} />
            <CardTitle>Comparable research plots</CardTitle>
          </View>
          <Text style={styles.note}>
            Historical reference data from research plots — not a direct measurement of this camp.
          </Text>
          {a.references.map((r) => (
            <View key={r.plot_name} style={styles.reference}>
              <View style={styles.referenceHead}>
                <Text style={styles.referenceName}>{r.site_name || r.plot_name}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{r.comparability}</Text>
                </View>
              </View>
              <Text style={styles.referenceBody}>
                Grass cover {fmt(r.grass_cover_pct)}% · bare ground {fmt(r.bare_ground_pct)}% · woody{" "}
                {fmt(r.woody_cover_pct)}%
              </Text>
              {r.distance_km != null ? (
                <Text style={styles.referenceMeta}>{fmt(r.distance_km, 0)} km away</Text>
              ) : null}
              {r.ecoregion ? <Text style={styles.referenceMeta}>{r.ecoregion}</Text> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {a.photo_findings?.length ? (
        <Card>
          <View style={styles.sectionHead}>
            <Ionicons name="images-outline" size={16} color={palette.veld[600]} />
            <CardTitle>Visual photo observations</CardTitle>
          </View>
          <Text style={styles.note}>
            Observations from photographs — they strengthen but do not replace the dataset, weather and farmer
            information.
          </Text>
          {a.photo_findings.map((p, i) => (
            <View key={i} style={styles.reference}>
              <Text style={styles.referenceName}>{String(p.direction || "general")} view</Text>
              <Text style={styles.referenceBody}>{String(p.summary || "")}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {engine ? <Text style={styles.engine}>Generated by {engine}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    borderLeftWidth: 4,
    borderLeftColor: palette.veld[600],
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  timestamp: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.7,
    marginTop: 8,
  },
  answer: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: palette.veld[800],
    marginTop: 10,
  },
  recommendation: {
    marginTop: 12,
    backgroundColor: palette.veld[50],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.veld[100],
    padding: 14,
  },
  recommendationLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: palette.veld[600],
  },
  recommendationText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
    marginTop: 4,
  },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  listenText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: palette.veld[600],
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dash: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[600],
    opacity: 0.6,
    marginTop: 8,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.veld[600],
    opacity: 0.85,
    marginTop: 6,
  },
  weatherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  weatherMetric: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: palette.sand[50],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 12,
  },
  weatherLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.8,
  },
  weatherValue: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: palette.veld[800],
    marginTop: 2,
  },
  reference: {
    marginTop: 10,
    backgroundColor: palette.sand[50],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 12,
  },
  referenceHead: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  referenceName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: palette.veld[800],
    textTransform: "capitalize",
  },
  referenceBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.veld[700],
    marginTop: 4,
  },
  referenceMeta: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.75,
    marginTop: 2,
  },
  tag: {
    backgroundColor: palette.white,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.sand[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    color: palette.veld[600],
  },
  engine: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.5,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
});
