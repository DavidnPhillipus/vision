"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

// Namibia default view
const DEFAULT_CENTER: [number, number] = [-22.0, 17.5];
const DEFAULT_ZOOM = 5;

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#2f5d3a;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lon: number, meta?: { accuracy_m?: number }) => void;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const marker = React.useRef<L.Marker | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [geoMsg, setGeoMsg] = React.useState<string | null>(null);
  const [mapFailed, setMapFailed] = React.useState(false);

  const place = React.useCallback((lat: number, lon: number, pan = true) => {
    if (!map.current) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lon], { icon: markerIcon, draggable: true }).addTo(map.current);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        onChange(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
      });
    } else {
      marker.current.setLatLng([lat, lon]);
    }
    if (pan) map.current.setView([lat, lon], Math.max(map.current.getZoom(), 12));
  }, [onChange]);

  // init map once
  React.useEffect(() => {
    if (!mapRef.current || map.current) return;
    try {
      const m = L.map(mapRef.current, { attributionControl: false }).setView(
        latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER,
        latitude != null && longitude != null ? 12 : DEFAULT_ZOOM,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(m);
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => {
        onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });
      map.current = m;
      if (latitude != null && longitude != null) place(latitude, longitude, false);
    } catch {
      setMapFailed(true);
    }
    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reflect external value changes on the map
  React.useEffect(() => {
    if (latitude != null && longitude != null && map.current) place(latitude, longitude);
  }, [latitude, longitude, place]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoMsg("This device does not support location. Tap the map or type coordinates instead.");
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        onChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)), { accuracy_m: accuracy });
        setGeoMsg(`Location found (accurate to about ${Math.round(accuracy)} m). Drag the pin to adjust.`);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Tap the map to place the camp instead."
            : "Could not get your location. Tap the map to place the camp instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {locating ? "Finding your location…" : "Use my current location"}
        </Button>
        {latitude != null && longitude != null ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-veld-700">
            <MapPin className="h-4 w-4" /> {fmt(latitude, 5)}, {fmt(longitude, 5)}
          </span>
        ) : (
          <span className="text-sm text-veld-600/70">No location set yet</span>
        )}
      </div>

      {mapFailed ? (
        <p className="rounded-lg bg-sand-100 px-3 py-3 text-sm text-veld-600/80 ring-1 ring-sand-200">
          The map could not load (poor connection). You can still use your current location or type coordinates.
        </p>
      ) : (
        <div ref={mapRef} className="h-64 w-full rounded-lg ring-1 ring-sand-200" />
      )}

      <p className="text-xs text-veld-600/70">
        Tap the map to place the camp, drag the pin to fine-tune, or use your device&apos;s GPS.
      </p>
      {geoMsg ? <p className="text-sm text-veld-700">{geoMsg}</p> : null}
    </div>
  );
}
