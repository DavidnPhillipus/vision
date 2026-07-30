"use client";

import * as React from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export type UploadedPhoto = { id: number; direction: string; previewUrl: string };

const DIRECTIONS = ["north", "east", "south", "west"] as const;

export function PhotoUpload({
  campId,
  photos,
  onChange,
}: {
  campId: number;
  photos: UploadedPhoto[];
  onChange: (p: UploadedPhoto[]) => void;
}) {
  const [mode, setMode] = React.useState<"general" | "guided">("general");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function handleFile(direction: string, file?: File | null) {
    if (!file) return;
    setBusy(direction);
    setErr(null);
    try {
      const res = await api.uploadPhoto(campId, direction, file);
      const preview = URL.createObjectURL(file);
      const next = photos.filter((p) => p.direction !== direction);
      onChange([...next, { id: res.id, direction, previewUrl: preview }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed. You can still continue without photos.");
    } finally {
      setBusy(null);
    }
  }

  function remove(direction: string) {
    onChange(photos.filter((p) => p.direction !== direction));
  }

  const slots = mode === "general" ? (["general"] as const) : DIRECTIONS;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-veld-50 p-4 ring-1 ring-veld-100">
        <p className="font-semibold text-veld-800">Add current camp photos for stronger evidence — optional</p>
        <p className="mt-1 text-sm text-veld-600/80">
          You can run a full assessment without any photos. Photos only strengthen the result.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("general")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ${
            mode === "general" ? "bg-veld-600 text-white ring-veld-700" : "bg-white text-veld-700 ring-sand-200"
          }`}
        >
          One general photo
        </button>
        <button
          type="button"
          onClick={() => setMode("guided")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ${
            mode === "guided" ? "bg-veld-600 text-white ring-veld-700" : "bg-white text-veld-700 ring-sand-200"
          }`}
        >
          Four guided photos (N, E, S, W)
        </button>
      </div>

      <div className={`grid gap-3 ${mode === "general" ? "grid-cols-1" : "grid-cols-2"}`}>
        {slots.map((dir) => {
          const existing = photos.find((p) => p.direction === dir);
          return (
            <div key={dir} className="rounded-lg border border-dashed border-sand-300 bg-white p-3">
              <p className="mb-2 text-sm font-medium capitalize text-veld-700">
                {dir === "general" ? "Camp photo" : `Facing ${dir}`}
              </p>
              {existing ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={existing.previewUrl} alt={dir} className="h-32 w-full rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => remove(dir)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-status-concern shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-sand-50 text-veld-600/70 hover:bg-sand-100">
                  {busy === dir ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">Tap to add</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFile(dir, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      {err ? <p className="text-sm text-status-concern">{err}</p> : null}
    </div>
  );
}
