import { ASSESS_STEPS, herdSummary, type Assessment, type Camp } from "@vision/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AssessmentProgress } from "../../src/components/AssessmentProgress";
import { AssessmentView } from "../../src/components/AssessmentView";
import { CampCard } from "../../src/components/CampCard";
import { PhotoUpload, type UploadedPhoto } from "../../src/components/PhotoUpload";
import {
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorText,
  Field,
  Label,
  Loading,
  PageHeader,
  ScreenScroll,
  TextArea,
  Toggle,
} from "../../src/components/ui";
import { useFarm } from "../../src/context/FarmContext";
import { useNetwork } from "../../src/context/NetworkContext";
import { api } from "../../src/lib/api";
import { fontFamily, palette, radii } from "../../src/lib/theme";

type Herd = {
  cattle_count: number;
  goat_count: number;
  sheep_count: number;
  other_livestock: string;
  rotational_grazing: boolean;
};

const EMPTY_HERD: Herd = {
  cattle_count: 0,
  goat_count: 0,
  sheep_count: 0,
  other_livestock: "",
  rotational_grazing: false,
};

export default function AssessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ camp?: string }>();
  const { camps, loading, refresh } = useFarm();
  const { online } = useNetwork();

  const [step, setStep] = useState(0);
  const [campId, setCampId] = useState<number | null>(null);
  const [herd, setHerd] = useState<Herd>(EMPTY_HERD);
  const [grazingStart, setGrazingStart] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    const preselect = typeof params.camp === "string" ? Number(params.camp) : NaN;
    if (!seeded.current && !Number.isNaN(preselect) && preselect > 0) {
      seeded.current = true;
      void selectCamp(preselect, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.camp]);

  async function selectCamp(id: number, nextStep = 1) {
    setCampId(id);
    setResult(null);
    setError(null);
    try {
      const camp: Camp = await api.camp(id);
      setHerd({
        cattle_count: camp.cattle_count,
        goat_count: camp.goat_count,
        sheep_count: camp.sheep_count,
        other_livestock: camp.other_livestock || "",
        rotational_grazing: camp.rotational_grazing,
      });
      setGrazingStart(camp.grazing_start_date ? camp.grazing_start_date.slice(0, 10) : "");
    } catch {
      setHerd(EMPTY_HERD);
    }
    setStep(nextStep);
  }

  async function run() {
    if (!campId) return;
    if (!online) {
      setError("Assessments need a connection (weather + AI). You can still review past assessments offline.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const assessment = await api.runAssessment({
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
        question: question.trim() || undefined,
      });
      setResult(assessment);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setResult(null);
    setStep(0);
    setPhotos([]);
    setQuestion("");
  }

  if (loading) return <Loading label="Loading camps…" />;

  if (camps.length === 0) {
    return (
      <ScreenScroll>
        <PageHeader title="Assess" subtitle="Run an explainable camp assessment." />
        <Empty
          title="No camps yet"
          message="Add a camp before running an assessment."
          action={<Button title="Add a camp" onPress={() => router.push("/camp/new")} />}
        />
      </ScreenScroll>
    );
  }

  if (running) {
    return (
      <ScreenScroll>
        <PageHeader title="Assessing" subtitle="Combining your herd, live weather and comparable research plots." />
        <AssessmentProgress />
      </ScreenScroll>
    );
  }

  if (result) {
    return (
      <ScreenScroll>
        <PageHeader title="Assessment" subtitle="Evidence, confidence and limitations included." />
        <AssessmentView a={result} />
        <Button title="Open camp" variant="outline" onPress={() => router.push(`/camp/${result.camp_id}`)} />
        <Button
          title="Ask a follow-up"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/(tabs)/ask", params: { ask: "Explain this assessment in simple terms" } })
          }
        />
        <Button title="Run another" variant="ghost" onPress={reset} />
      </ScreenScroll>
    );
  }

  const selectedCamp = camps.find((c) => c.id === campId) || null;

  return (
    <ScreenScroll>
      <PageHeader title="Assess" subtitle="Five short steps. Photos are optional." />

      <View style={styles.stepper}>
        {ASSESS_STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <>
          <CardTitle>Which camp?</CardTitle>
          <View style={{ marginTop: 10 }}>
            {camps.map((camp) => (
              <CampCard key={camp.id} camp={camp} selected={camp.id === campId} onPress={() => selectCamp(camp.id)} />
            ))}
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardTitle>Livestock in {selectedCamp?.name}</CardTitle>
          <Label>Cattle</Label>
          <Field
            keyboardType="number-pad"
            value={String(herd.cattle_count)}
            onChangeText={(v) => setHerd({ ...herd, cattle_count: Number(v.replace(/\D/g, "")) || 0 })}
          />
          <Label>Goats</Label>
          <Field
            keyboardType="number-pad"
            value={String(herd.goat_count)}
            onChangeText={(v) => setHerd({ ...herd, goat_count: Number(v.replace(/\D/g, "")) || 0 })}
          />
          <Label>Sheep</Label>
          <Field
            keyboardType="number-pad"
            value={String(herd.sheep_count)}
            onChangeText={(v) => setHerd({ ...herd, sheep_count: Number(v.replace(/\D/g, "")) || 0 })}
          />
          <Label>Other livestock (optional)</Label>
          <Field
            value={herd.other_livestock}
            onChangeText={(v) => setHerd({ ...herd, other_livestock: v })}
            placeholder="e.g. 4 donkeys"
          />
          <Toggle
            label="This camp is part of a rotational grazing plan"
            value={herd.rotational_grazing}
            onChange={(v) => setHerd({ ...herd, rotational_grazing: v })}
          />
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardTitle>Grazing</CardTitle>
          <Text style={styles.help}>When did the animals move into this camp? Leave blank if you are unsure.</Text>
          <Label>Grazing start date</Label>
          <Field value={grazingStart} onChangeText={setGrazingStart} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        </Card>
      ) : null}

      {step === 3 ? <PhotoUpload campId={campId} photos={photos} onChange={setPhotos} /> : null}

      {step === 4 ? (
        <Card>
          <CardTitle>Review</CardTitle>
          <Info label="Camp" value={selectedCamp?.name || "—"} />
          <Info label="Herd" value={herdSummary(herd)} />
          <Info label="Grazing since" value={grazingStart || "Not set"} />
          <Info label="Photos" value={photos.length ? `${photos.length} attached` : "None"} />
          <Label>Your question (optional)</Label>
          <TextArea
            value={question}
            onChangeText={setQuestion}
            placeholder="e.g. Is this camp overgrazed for my current herd?"
          />
          <ErrorText>{error}</ErrorText>
        </Card>
      ) : null}

      <View style={styles.navRow}>
        {step > 0 ? (
          <Button title="Back" variant="outline" onPress={() => setStep(step - 1)} style={styles.navBtn} />
        ) : null}
        {step < 4 ? (
          <Button
            title="Continue"
            onPress={() => setStep(step + 1)}
            disabled={step === 0 && !campId}
            style={styles.navBtn}
          />
        ) : (
          <Button title="Run assessment" icon="sparkles-outline" onPress={run} style={styles.navBtn} />
        )}
      </View>
    </ScreenScroll>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.sand[300],
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: palette.veld[600],
    borderColor: palette.veld[600],
  },
  stepNum: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: palette.veld[600],
  },
  stepNumActive: {
    color: palette.sand[50],
  },
  stepLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
    color: palette.veld[600],
    opacity: 0.7,
  },
  stepLabelActive: {
    fontFamily: fontFamily.bodyBold,
    opacity: 1,
    color: palette.veld[800],
  },
  help: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.veld[700],
    marginTop: 6,
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.sand[200],
  },
  infoLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: palette.veld[600],
  },
  infoValue: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[800],
    flexShrink: 1,
    textAlign: "right",
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
  },
  navBtn: {
    flex: 1,
  },
  progress: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[700],
    textAlign: "center",
    marginTop: 14,
  },
});
