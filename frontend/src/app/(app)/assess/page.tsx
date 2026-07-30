"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ChevronLeft, Camera, CheckCircle2 } from "lucide-react";
import { useFarm } from "@/components/providers";
import { api, type Assessment, type Camp } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState, Empty } from "@/components/states";
import { AssessmentProgress } from "@/components/assessment-progress";
import { AssessmentView } from "@/components/assessment-view";
import { PhotoUpload, type UploadedPhoto } from "@/components/photo-upload";
import { PageHeader, SoftPanel } from "@/components/page-header";
import { CampCard } from "@/components/camp-card";
import Link from "next/link";

const STEPS = ["Camp", "Herd", "Grazing", "Photos", "Review"];

export default function AssessPage() {
  return (
    <Suspense fallback={<Loading label="Loading…" />}>
      <AssessWizard />
    </Suspense>
  );
}

function AssessWizard() {
  const { camps, loading } = useFarm();
  const router = useRouter();
  const search = useSearchParams();
  const preCamp = search.get("camp");

  const [step, setStep] = React.useState(0);
  const [campId, setCampId] = React.useState<number | null>(preCamp ? Number(preCamp) : null);
  const [camp, setCamp] = React.useState<Camp | null>(null);
  const [herd, setHerd] = React.useState({
    cattle_count: 0,
    goat_count: 0,
    sheep_count: 0,
    other_livestock: "",
    rotational_grazing: false,
  });
  const [grazingStart, setGrazingStart] = React.useState<string>("");
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>([]);
  const [question, setQuestion] = React.useState("");

  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<Assessment | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (campId == null) return;
    api
      .camp(campId)
      .then((c) => {
        setCamp(c);
        setHerd({
          cattle_count: c.cattle_count,
          goat_count: c.goat_count,
          sheep_count: c.sheep_count,
          other_livestock: c.other_livestock || "",
          rotational_grazing: c.rotational_grazing,
        });
        setGrazingStart(c.grazing_start_date || "");
      })
      .catch(() => undefined);
  }, [campId]);

  React.useEffect(() => {
    if (preCamp && camps.length && step === 0) setStep(1);
  }, [preCamp, camps, step]);

  async function run() {
    if (campId == null) return;
    setRunning(true);
    setError(null);
    try {
      const a = await api.runAssessment({
        camp_id: campId,
        herd: {
          cattle_count: herd.cattle_count,
          goat_count: herd.goat_count,
          sheep_count: herd.sheep_count,
          other_livestock: herd.other_livestock || null,
          rotational_grazing: herd.rotational_grazing,
          grazing_start_date: grazingStart || null,
        },
        photo_ids: photos.map((p) => p.id),
        question: question || undefined,
      });
      setResult(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed. Your inputs are kept — try again.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <Loading label="Loading camps…" />;

  if (!camps.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Run an assessment" description="Add a camp first so Vision has something to assess." />
        <Empty
          action={
            <Link href="/camps/new">
              <Button>Add a camp</Button>
            </Link>
          }
        >
          You need at least one camp before running an assessment.
        </Empty>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={`Assessment · ${camp?.name}`}
          description="Vision combined your herd data, live weather, and comparable research plots."
          actions={
            <>
              <Button variant="outline" onClick={() => router.push(`/camps/${campId}`)}>
                View camp
              </Button>
              <Button onClick={() => router.push(`/advisor?camp=${campId}`)}>Ask a follow-up</Button>
            </>
          }
        />
        <AssessmentView a={result} />
      </div>
    );
  }

  if (running) {
    return (
      <SoftPanel className="mx-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-veld-600/70">Working</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-veld-800">Assessing {camp?.name}…</h2>
        <p className="mt-2 text-veld-700/75">This usually takes a short moment. Keep this page open.</p>
        <AssessmentProgress />
      </SoftPanel>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Run an assessment"
        description="A few clear steps. Photos are optional — full advice still works without them."
      />

      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-sand-200/80">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    i < step
                      ? "bg-veld-600 text-white"
                      : i === step
                        ? "bg-veld-600 text-white ring-4 ring-veld-200"
                        : "bg-sand-200 text-veld-600/60"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`truncate text-[11px] font-semibold ${i === step ? "text-veld-800" : "text-veld-600/55"}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div className={`mb-5 h-0.5 w-full max-w-10 ${i < step ? "bg-veld-600" : "bg-sand-200"}`} />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Card className="min-h-[300px] rounded-2xl">
        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <CardTitle>Select a camp</CardTitle>
              <p className="mt-1 text-sm text-veld-600/75">Choose which paddock you want Vision to assess.</p>
            </div>
            <div className="grid gap-3">
              {camps.map((c) => (
                <CampCard key={c.id} camp={c} selected={campId === c.id} onClick={() => setCampId(c.id)} />
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <CardTitle>Confirm current herd</CardTitle>
              <p className="mt-1 text-sm text-veld-600/75">Update counts if the herd changed since you last saved this camp.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Num label="Cattle" value={herd.cattle_count} onChange={(v) => setHerd({ ...herd, cattle_count: v })} />
              <Num label="Goats" value={herd.goat_count} onChange={(v) => setHerd({ ...herd, goat_count: v })} />
              <Num label="Sheep" value={herd.sheep_count} onChange={(v) => setHerd({ ...herd, sheep_count: v })} />
            </div>
            <div>
              <label className="label">Other livestock (optional)</label>
              <input
                className="input"
                value={herd.other_livestock}
                onChange={(e) => setHerd({ ...herd, other_livestock: e.target.value })}
                placeholder="e.g. 3 horses"
              />
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-3 text-sm text-veld-700 ring-1 ring-sand-200">
              <input
                type="checkbox"
                checked={herd.rotational_grazing}
                onChange={(e) => setHerd({ ...herd, rotational_grazing: e.target.checked })}
              />
              This camp is part of a rotational grazing system
            </label>
            <p className="text-xs text-veld-600/60">
              Cattle, goats and sheep stay separate. Vision estimates pressure with a disclosed livestock-unit formula —
              not by adding the headcounts together.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <CardTitle>Grazing information</CardTitle>
              <p className="mt-1 text-sm text-veld-600/75">How long the herd has been on this camp matters as much as how many animals.</p>
            </div>
            <div>
              <label className="label">When did the herd start grazing this camp?</label>
              <input type="date" className="input" value={grazingStart} onChange={(e) => setGrazingStart(e.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-veld-50 px-4 py-3 ring-1 ring-veld-100">
              <Camera className="mt-0.5 h-5 w-5 text-veld-700" />
              <div>
                <p className="font-semibold text-veld-800">Photos are optional</p>
                <p className="text-sm text-veld-700/75">
                  Skip this step if connectivity is limited. Vision still assesses using herd, weather, and research data.
                </p>
              </div>
            </div>
            {campId != null ? <PhotoUpload campId={campId} photos={photos} onChange={setPhotos} /> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div>
              <CardTitle>Review &amp; run</CardTitle>
              <p className="mt-1 text-sm text-veld-600/75">Check the summary, then let Vision prepare the recommendation.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Camp" value={camp?.name} />
              <Info label="Herd" value={`${herd.cattle_count} cattle, ${herd.goat_count} goats, ${herd.sheep_count} sheep`} />
              <Info label="Grazing since" value={grazingStart || "not set"} />
              <Info label="Photos" value={photos.length ? `${photos.length} added` : "none (optional)"} />
            </dl>
            <div>
              <label className="label">Optional question for Vision</label>
              <input
                className="input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Should I move my herd soon?"
              />
            </div>
            {error ? <ErrorState message={error} onRetry={run} /> : null}
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && campId == null} size="lg">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={run} disabled={campId == null}>
            Run assessment
          </Button>
        )}
      </div>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        min={0}
        className="input"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
      <dt className="text-xs font-medium text-veld-600/70">{label}</dt>
      <dd className="mt-0.5 font-semibold text-veld-800">{value || "—"}</dd>
    </div>
  );
}
