import { ROUND_LABEL, type Photo } from "@vision/shared";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";

import { api, getApiToken } from "../lib/api";
import { fontFamily, palette, radii } from "../lib/theme";
import { Card, CardTitle } from "./ui";

function bytesToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : "=";
    out += i + 2 < bytes.length ? chars[c & 63] : "=";
  }
  return out;
}

/** Load an authenticated photo URL into a displayable URI. */
export function useAuthImage(url: string | null) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setUri(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const token = getApiToken();
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("photo fetch failed");
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        if (Platform.OS === "web" && typeof URL !== "undefined" && typeof Blob !== "undefined") {
          const blob = new Blob([buf], { type: res.headers.get("content-type") || "image/jpeg" });
          objectUrl = URL.createObjectURL(blob);
          setUri(objectUrl);
        } else {
          setUri(`data:image/jpeg;base64,${bytesToBase64(new Uint8Array(buf))}`);
        }
      } catch {
        if (!cancelled) setUri(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return uri;
}

function PhotoThumb({ photo }: { photo: Photo }) {
  const uri = useAuthImage(api.photoUrl(photo.id));
  return (
    <View style={styles.thumbWrap}>
      {uri ? <Image source={{ uri }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
      <Text style={styles.thumbLabel}>{photo.direction}</Text>
    </View>
  );
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (!photos.length) return null;
  return (
    <Card>
      <CardTitle>Camp photos</CardTitle>
      <View style={styles.grid}>
        {photos.map((p) => (
          <PhotoThumb key={p.id} photo={p} />
        ))}
      </View>
    </Card>
  );
}

export function ReferenceTrend({ plotName, siteName }: { plotName: string; siteName?: string | null }) {
  const [rows, setRows] = useState<{ round: string; grass: number | null; bare: number | null; woody: number | null }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const detail = await api.plot(plotName);
        if (!alive) return;
        setRows(
          (detail.cover_rounds || []).map((r) => ({
            round: ROUND_LABEL[r.round] || r.round,
            grass: r.grass_cover_pct,
            bare: r.bare_ground_pct,
            woody: r.woody_cover_pct,
          })),
        );
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load trend");
      }
    })();
    return () => {
      alive = false;
    };
  }, [plotName]);

  if (error) return null;
  if (!rows.length) return null;

  return (
    <Card>
      <CardTitle>Comparable research trend</CardTitle>
      <Text style={styles.hint}>
        {siteName ? `${siteName} · ` : ""}
        {plotName} — research observations, not this camp.
      </Text>
      {rows.map((r) => (
        <View key={r.round} style={styles.trendRow}>
          <Text style={styles.trendRound}>{r.round}</Text>
          <Text style={styles.trendVals}>
            grass {r.grass ?? "—"}% · bare {r.bare ?? "—"}% · woody {r.woody ?? "—"}%
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  thumbWrap: {
    width: 84,
    alignItems: "center",
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.sand[200],
  },
  thumbEmpty: {
    backgroundColor: palette.sand[100],
  },
  thumbLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: palette.veld[700],
    marginTop: 6,
    textTransform: "capitalize",
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.veld[600],
    marginTop: 6,
    marginBottom: 8,
  },
  trendRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: palette.sand[200],
  },
  trendRound: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: palette.veld[800],
  },
  trendVals: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: palette.veld[700],
    marginTop: 2,
  },
});
