import { statusLabel } from "@vision/shared";
import { StyleSheet, Text, View } from "react-native";

import { fontFamily, palette, radii, statusTone } from "../lib/theme";

export function StatusBadge({ status, size = "md" }: { status?: string | null; size?: "sm" | "md" }) {
  const tone = statusTone(status);
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg, borderColor: tone.border },
        size === "sm" && { paddingHorizontal: 8, paddingVertical: 3 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.text, { color: tone.fg, fontSize: size === "sm" ? 11 : 12 }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function ConfidencePill({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  return (
    <View style={styles.confidence}>
      <Text style={styles.confidenceText}>Confidence: {confidence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontFamily: fontFamily.bodyBold,
  },
  confidence: {
    alignSelf: "flex-start",
    backgroundColor: palette.veld[50],
    borderWidth: 1,
    borderColor: palette.veld[100],
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: palette.veld[700],
  },
});
