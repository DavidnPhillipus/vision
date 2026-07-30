import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetwork } from "../context/NetworkContext";
import { fontFamily, palette } from "../lib/theme";

export function ConnectivityBanner() {
  const insets = useSafeAreaInsets();
  const { online, slow, fromCache, cacheAgeLabel, pendingCount } = useNetwork();

  if (online && !slow && !fromCache && pendingCount === 0) return null;

  let icon: keyof typeof Ionicons.glyphMap = "hourglass-outline";
  let message = "Connection is slow — still loading…";
  let bg: string = palette.amber[50];
  let fg: string = palette.status.watch;
  let border: string = palette.amber[200];

  if (!online) {
    icon = "cloud-offline-outline";
    message = fromCache
      ? `Working offline — camps & history from this phone${cacheAgeLabel ? ` (${cacheAgeLabel})` : ""}. Ask / Assess need data.`
      : "Offline — connect once so Vision can save your camps on this phone.";
    bg = palette.sand[100];
    fg = palette.veld[800];
    border = palette.sand[300];
  } else if (pendingCount > 0) {
    icon = "sync-outline";
    message = `Online — syncing ${pendingCount} saved change${pendingCount === 1 ? "" : "s"}…`;
    bg = palette.veld[50];
    fg = palette.veld[800];
    border = palette.veld[200];
  } else if (fromCache && !slow) {
    icon = "cloud-download-outline";
    message = `Online — refreshing saved data${cacheAgeLabel ? ` from ${cacheAgeLabel}` : ""}…`;
    bg = palette.veld[50];
    fg = palette.veld[800];
    border = palette.veld[200];
  }

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8), backgroundColor: bg, borderBottomColor: border }]}>
      <Ionicons name={icon} size={14} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  text: {
    flexShrink: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});
