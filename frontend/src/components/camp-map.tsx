import { MapPin } from "lucide-react";
import { fmt } from "@/lib/utils";

/** Lightweight static map via OpenStreetMap; branded empty state when no pin. */
export function CampMap({ lat, lon, name }: { lat: number | null; lon: number | null; name: string }) {
  if (lat == null || lon == null) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-veld-100 via-sand-100 to-sand-200 ring-1 ring-sand-200">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(47,93,58,0.18) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(193,122,74,0.15) 0, transparent 35%)",
        }} />
        <div className="relative flex min-h-[14rem] flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-veld-700 shadow-sm ring-1 ring-sand-200">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="font-display text-lg font-semibold text-veld-800">No map pin yet</p>
          <p className="max-w-xs text-sm text-veld-700/75">
            Set a location for {name} so Vision can pull live rainfall for this camp.
          </p>
        </div>
      </div>
    );
  }
  const d = 0.15;
  const bbox = `${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-sand-200">
      <iframe title={`Map of ${name}`} src={src} loading="lazy" className="h-56 w-full border-0" />
      <div className="flex items-center gap-1.5 bg-white px-3 py-2 text-xs text-veld-600/80">
        <MapPin className="h-3.5 w-3.5" /> {fmt(lat, 4)}, {fmt(lon, 4)}
      </div>
    </div>
  );
}
