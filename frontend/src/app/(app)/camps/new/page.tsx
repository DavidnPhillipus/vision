"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import { useFarm } from "@/components/providers";
import { useNetwork } from "@/components/network-provider";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState, Empty } from "@/components/states";
import { PageHeader, SoftPanel } from "@/components/page-header";

const LocationPicker = dynamic(
  () => import("@/components/location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Loading label="Loading map…" /> },
);

export default function NewCampPage() {
  const { farm, loading, refresh } = useFarm();
  const { queueCreateCamp } = useNetwork();
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: "",
    region: "",
    latitude: "",
    longitude: "",
    area_ha: "",
    cattle_count: 0,
    goat_count: 0,
    sheep_count: 0,
    grazing_start_date: "",
    rotational_grazing: false,
    observations: "",
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdId, setCreatedId] = React.useState<number | null>(null);
  const [createdName, setCreatedName] = React.useState("");
  const [queuedOffline, setQueuedOffline] = React.useState(false);

  if (loading) return <Loading />;
  if (!farm) {
    return (
      <Empty
        action={
          <Link href="/register">
            <Button>Create an account</Button>
          </Link>
        }
      >
        No farm is linked to this session. Sign in again or register to create your farm.
      </Empty>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!farm) return;
    setBusy(true);
    setError(null);
    try {
      const result = await queueCreateCamp({
        farm_id: farm.id,
        name: form.name,
        region: form.region || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        cattle_count: form.cattle_count,
        goat_count: form.goat_count,
        sheep_count: form.sheep_count,
        grazing_start_date: form.grazing_start_date || null,
        rotational_grazing: form.rotational_grazing,
        observations: form.observations || null,
      });
      if ("queued" in result && result.queued) {
        setQueuedOffline(true);
        setCreatedName(form.name);
        setCreatedId(-1);
      } else {
        await refresh();
        setCreatedId(result.id);
        setCreatedName(result.name);
      }
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the camp.");
      setBusy(false);
    }
  }

  if (createdId) {
    return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <SoftPanel className="bg-gradient-to-br from-veld-700 to-veld-600 text-white ring-0">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-sand-100/80">
                {queuedOffline ? "Saved on this device" : "Camp created"}
              </p>
              <h1 className="font-display mt-1 text-3xl font-semibold">{createdName}</h1>
              <p className="mt-2 text-sand-100/85">
                {queuedOffline
                  ? "You're offline — this camp will upload when you're back online. Assessment and Ask need a connection."
                  : "Next, run an assessment or ask Vision a grazing question for this paddock."}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {!queuedOffline && createdId > 0 ? (
              <>
            <Button
              className="bg-white text-veld-800 hover:bg-sand-50"
              onClick={() => router.push(`/assess?camp=${createdId}`)}
            >
              <ClipboardCheck className="h-4 w-4" /> Run assessment
            </Button>
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => router.push(`/advisor?camp=${createdId}`)}
            >
              <MessageCircleQuestion className="h-4 w-4" /> Ask Vision
            </Button>
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => router.push(`/camps/${createdId}`)}
            >
              Open camp
            </Button>
              </>
            ) : (
              <Button
                className="bg-white text-veld-800 hover:bg-sand-50"
                onClick={() => router.push("/camps")}
              >
                Back to camps
              </Button>
            )}
          </div>
        </SoftPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        backHref="/camps"
        backLabel="Camps"
        title="Add a camp"
        description="Pin the paddock on the map, set area and herd numbers, then Vision can assess it."
      />
      <form onSubmit={submit}>
        <Card className="space-y-4">
          <CardTitle>Camp details</CardTitle>
          <div>
            <label className="label">Camp name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. North Camp"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Region</label>
              <input
                className="input"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g. Otjozondjupa"
              />
            </div>
            <div>
              <label className="label">Area (hectares)</label>
              <input
                className="input"
                type="number"
                value={form.area_ha}
                onChange={(e) => setForm({ ...form, area_ha: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Camp location</label>
            <LocationPicker
              latitude={form.latitude ? Number(form.latitude) : null}
              longitude={form.longitude ? Number(form.longitude) : null}
              onChange={(lat, lon) => setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lon) }))}
            />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="-19.5"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="17.9"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["cattle_count", "goat_count", "sheep_count"] as const).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k.split("_")[0]}</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="label">Grazing start date</label>
            <input
              className="input"
              type="date"
              value={form.grazing_start_date}
              onChange={(e) => setForm({ ...form, grazing_start_date: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-3 text-sm text-veld-700 ring-1 ring-sand-200">
            <input
              type="checkbox"
              checked={form.rotational_grazing}
              onChange={(e) => setForm({ ...form, rotational_grazing: e.target.checked })}
            />
            Part of a rotational grazing system
          </label>
          <div>
            <label className="label">Observations (optional)</label>
            <textarea
              className="input h-24 py-2"
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              placeholder="e.g. Grass short near the water point"
            />
          </div>
          {error ? <ErrorState message={error} /> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !form.name} size="lg">
              {busy ? "Saving…" : "Create camp"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
