import { Ionicons } from "@expo/vector-icons";
import { ASK_SUGGESTIONS, latestAssessment, type Assessment } from "@vision/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "../../src/components/StatusBadge";
import {
  Button,
  Card,
  ErrorState,
  Loading,
  ScreenScroll,
  SectionLabel,
  TextArea,
} from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useFarm } from "../../src/context/FarmContext";
import { api } from "../../src/lib/api";
import { fontFamily, palette } from "../../src/lib/theme";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { farm, camps, loading, error, refresh } = useFarm();
  const router = useRouter();
  const [ask, setAsk] = useState("");
  const [latest, setLatest] = useState<Assessment | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (camps.length === 0) {
        setLatest(null);
        return;
      }
      (async () => {
        try {
          const all = await Promise.all(camps.map((c) => api.campAssessments(c.id)));
          if (alive) setLatest(latestAssessment(all.flat()));
        } catch {
          /* advice card is optional */
        }
      })();
      return () => {
        alive = false;
      };
    }, [camps]),
  );

  function goAsk(text: string) {
    const q = text.trim();
    router.push(q ? { pathname: "/(tabs)/ask", params: { ask: q } } : "/(tabs)/ask");
    setAsk("");
  }

  if (loading) return <Loading label="Loading your farm…" />;
  if (error) return <ScreenScroll><ErrorState message={error} onRetry={refresh} /></ScreenScroll>;
  if (!farm)
    return (
      <ScreenScroll>
        <ErrorState message="No farm found for this account yet." onRetry={refresh} />
      </ScreenScroll>
    );

  const firstName = user?.full_name?.split(" ")[0] || "there";

  if (camps.length === 0) {
    return (
      <ScreenScroll>
        <Text style={styles.greeting}>Welcome, {firstName}</Text>
        <Text style={styles.hero}>{farm.name}</Text>
        <Card>
          <Text style={styles.onboardTitle}>Add your first camp</Text>
          <Text style={styles.onboardBody}>
            Vision needs one camp — its size, location and current livestock — before it can give grazing advice.
            It takes about a minute.
          </Text>
          <Button title="Add a camp" icon="add-circle-outline" onPress={() => router.push("/camp/new")} />
          <Button title="Ask a question first" variant="outline" onPress={() => router.push("/(tabs)/ask")} />
        </Card>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <View style={styles.topRow}>
        <Text style={styles.greeting}>Good to see you, {firstName}</Text>
        <Pressable onPress={() => logout()} hitSlop={8}>
          <Ionicons name="log-out-outline" size={20} color={palette.veld[600]} />
        </Pressable>
      </View>
      <Text style={styles.hero}>What do you want to know about your grazing?</Text>

      <View style={styles.askBox}>
        <TextArea
          value={ask}
          onChangeText={setAsk}
          placeholder="Ask Vision anything about your camps, herd, or rainfall…"
          style={styles.askInput}
        />
        <View style={styles.askFooter}>
          <Text style={styles.askHint}>Uses your farm data + live weather</Text>
          <Pressable onPress={() => goAsk(ask)} style={styles.askBtn}>
            <Text style={styles.askBtnText}>Ask Vision</Text>
            <Ionicons name="arrow-up" size={14} color={palette.white} />
          </Pressable>
        </View>
      </View>

      <View style={styles.chips}>
        {ASK_SUGGESTIONS.map((s) => (
          <Pressable key={s} onPress={() => goAsk(s)} style={styles.suggestion}>
            <Text style={styles.suggestionText}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>Your farm</SectionLabel>
      <Card>
        <Text style={styles.farmName}>{farm.name}</Text>
        {farm.region ? <Text style={styles.farmRegion}>{farm.region}</Text> : null}
        <View style={styles.links}>
          <QuickLink label="Camps" value={String(camps.length)} onPress={() => router.push("/(tabs)/camps")} />
          <QuickLink label="Run an assessment" onPress={() => router.push("/(tabs)/assess")} />
          <QuickLink label="Compare camps" onPress={() => router.push("/(tabs)/compare")} />
          <QuickLink label="Add a camp" onPress={() => router.push("/camp/new")} />
        </View>
      </Card>

      {latest ? (
        <>
          <SectionLabel>Latest advice</SectionLabel>
          <Card>
            <StatusBadge status={latest.status} size="sm" />
            <Text style={styles.latestText}>{latest.recommendation}</Text>
            <Button
              title="Open camp"
              variant="outline"
              size="md"
              onPress={() => router.push(`/camp/${latest.camp_id}`)}
            />
          </Card>
        </>
      ) : null}
    </ScreenScroll>
  );
}

function QuickLink({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link}>
      <Text style={styles.linkLabel}>{label}</Text>
      {value ? <Text style={styles.linkValue}>{value}</Text> : <Ionicons name="chevron-forward" size={16} color={palette.veld[600]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[600],
    opacity: 0.8,
  },
  hero: {
    fontFamily: fontFamily.displayBold,
    fontSize: 30,
    lineHeight: 36,
    color: palette.veld[900],
    letterSpacing: -0.6,
    marginTop: 8,
  },
  askBox: {
    marginTop: 20,
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 8,
  },
  askInput: {
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 84,
    fontSize: 16,
  },
  askFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 4,
    gap: 8,
  },
  askHint: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.6,
    flex: 1,
  },
  askBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.veld[800],
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  askBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: palette.white,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  suggestion: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.sand[300],
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: palette.veld[700],
  },
  farmName: {
    fontFamily: fontFamily.displayBold,
    fontSize: 20,
    color: palette.veld[900],
  },
  farmRegion: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[600],
    marginTop: 2,
  },
  links: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.sand[200],
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.sand[200],
  },
  linkLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: palette.veld[800],
  },
  linkValue: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: palette.veld[600],
  },
  latestText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
    marginTop: 10,
  },
  onboardTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: palette.veld[900],
  },
  onboardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[700],
    marginTop: 8,
  },
});
