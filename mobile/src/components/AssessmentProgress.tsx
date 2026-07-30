import { ASSESS_PROGRESS_STAGES } from "@vision/shared";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fontFamily, palette, radii } from "../lib/theme";
import { Card } from "./ui";

export function AssessmentProgress() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, ASSESS_PROGRESS_STAGES.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <Card>
      {ASSESS_PROGRESS_STAGES.map((stage, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <View key={stage} style={[styles.row, current && styles.rowActive]}>
            <View style={styles.iconWrap}>
              {done ? (
                <Ionicons name="checkmark" size={16} color={palette.status.good} />
              ) : current ? (
                <ActivityIndicator size="small" color={palette.veld[600]} />
              ) : (
                <View style={styles.dot} />
              )}
            </View>
            <Text style={[styles.text, (done || current) && styles.textActive]}>{stage}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
  },
  rowActive: {
    backgroundColor: palette.veld[50],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.sand[200],
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.sand[300],
  },
  text: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: palette.veld[600],
    opacity: 0.5,
  },
  textActive: {
    fontFamily: fontFamily.bodySemi,
    color: palette.veld[800],
    opacity: 1,
  },
});
