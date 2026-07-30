import { Ionicons } from "@expo/vector-icons";
import { PHOTO_DIRECTIONS, type PhotoDirection } from "@vision/shared";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import { fontFamily, palette, radii } from "../lib/theme";
import { Button, Card, CardTitle } from "./ui";

export type UploadedPhoto = { id: number; direction: string; uri: string };

type Slot = { key: PhotoDirection; label: string };

const GENERAL: Slot[] = [{ key: "general", label: "General view" }];

export function PhotoUpload({
  campId,
  photos,
  onChange,
}: {
  campId: number | null;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const [guided, setGuided] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const slots = guided ? PHOTO_DIRECTIONS : GENERAL;

  async function pick(direction: PhotoDirection, fromCamera = false) {
    if (!campId) {
      Alert.alert("Pick a camp first", "Choose the camp before adding photos.");
      return;
    }
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow camera access to photograph the camp.");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to attach camp photos.");
        return;
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setBusy(direction);
    try {
      const uploaded = await api.uploadPhoto(campId, direction, {
        uri: asset.uri,
        name: asset.fileName || `${direction}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      onChange([...photos.filter((p) => p.direction !== direction), { id: uploaded.id, direction, uri: asset.uri }]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Could not upload the photo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardTitle>Photos (optional)</CardTitle>
      <Text style={styles.hint}>
        Photos strengthen the assessment but never replace the dataset, weather and your own knowledge.
      </Text>

      <View style={styles.modeRow}>
        <Pressable onPress={() => setGuided(false)} style={[styles.mode, !guided && styles.modeActive]}>
          <Text style={[styles.modeText, !guided && styles.modeTextActive]}>One photo</Text>
        </Pressable>
        <Pressable onPress={() => setGuided(true)} style={[styles.mode, guided && styles.modeActive]}>
          <Text style={[styles.modeText, guided && styles.modeTextActive]}>Four directions</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {slots.map((slot) => {
          const existing = photos.find((p) => p.direction === slot.key);
          return (
            <Pressable
              key={slot.key}
              onPress={() =>
                Alert.alert("Add photo", "Choose a source", [
                  { text: "Camera", onPress: () => void pick(slot.key, true) },
                  { text: "Library", onPress: () => void pick(slot.key, false) },
                  { text: "Cancel", style: "cancel" },
                ])
              }
              style={styles.slot}
            >
              {existing ? (
                <Image source={{ uri: existing.uri }} style={styles.thumb} />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons
                    name={busy === slot.key ? "hourglass-outline" : "camera-outline"}
                    size={20}
                    color={palette.veld[600]}
                  />
                </View>
              )}
              <Text style={styles.slotLabel}>{slot.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {photos.length ? (
        <Button title="Clear photos" variant="ghost" size="md" onPress={() => onChange([])} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.veld[600],
    opacity: 0.85,
    marginTop: 6,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  mode: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.sand[300],
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.white,
  },
  modeActive: {
    backgroundColor: palette.veld[600],
    borderColor: palette.veld[600],
  },
  modeText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: palette.veld[800],
  },
  modeTextActive: {
    color: palette.sand[50],
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  slot: {
    width: 84,
    alignItems: "center",
  },
  placeholder: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.sand[300],
    backgroundColor: palette.sand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.sand[200],
  },
  slotLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: palette.veld[700],
    marginTop: 6,
    textAlign: "center",
  },
});
