import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text } from "react-native";

import { fontFamily, palette } from "../lib/theme";
import { Button } from "./ui";

/**
 * Same job as the website LocationPicker — set camp coordinates — using device
 * GPS instead of a Leaflet map (Expo Go has no map SDK by default).
 */
export function UseMyLocationButton({
  onLocated,
}: {
  onLocated: (lat: number, lon: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function locate() {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission", "Allow location access to pin this camp, or type latitude and longitude.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onLocated(Number(pos.coords.latitude.toFixed(5)), Number(pos.coords.longitude.toFixed(5)));
    } catch (e) {
      Alert.alert("Location failed", e instanceof Error ? e.message : "Could not read GPS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        title={busy ? "Finding…" : "Use my location"}
        icon="locate-outline"
        variant="outline"
        size="md"
        loading={busy}
        onPress={locate}
      />
      {Platform.OS === "web" ? (
        <Text style={styles.hint}>
          <Ionicons name="information-circle-outline" size={12} color={palette.veld[600]} /> On web this uses the
          browser location prompt — same coordinates the website would save.
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    marginTop: 6,
    lineHeight: 16,
  },
});
