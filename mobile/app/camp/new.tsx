import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Button,
  Card,
  CardTitle,
  ErrorText,
  Field,
  Label,
  PageHeader,
  ScreenScroll,
  TextArea,
  Toggle,
} from "../../src/components/ui";
import { UseMyLocationButton } from "../../src/components/UseMyLocationButton";
import { useFarm } from "../../src/context/FarmContext";
import { useNetwork } from "../../src/context/NetworkContext";
import { fontFamily, palette } from "../../src/lib/theme";

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function NewCampScreen() {
  const router = useRouter();
  const { farm, refresh } = useFarm();
  const { queueCreateCamp } = useNetwork();

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [cattle, setCattle] = useState("0");
  const [goats, setGoats] = useState("0");
  const [sheep, setSheep] = useState("0");
  const [grazingStart, setGrazingStart] = useState("");
  const [rotational, setRotational] = useState(true);
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function save() {
    if (!farm) return;
    if (!name.trim()) {
      setError("Give the camp a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await queueCreateCamp({
        farm_id: farm.id,
        name: name.trim(),
        region: region.trim() || null,
        area_ha: toNumber(areaHa),
        latitude: toNumber(latitude),
        longitude: toNumber(longitude),
        cattle_count: Number(cattle) || 0,
        goat_count: Number(goats) || 0,
        sheep_count: Number(sheep) || 0,
        grazing_start_date: grazingStart.trim() || null,
        rotational_grazing: rotational,
        observations: observations.trim() || null,
      });
      if ("queued" in result && result.queued) {
        setCreatedId(-1);
      } else {
        setCreatedId((result as { id: number }).id);
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the camp.");
    } finally {
      setSaving(false);
    }
  }

  if (createdId) {
    return (
      <ScreenScroll>
        <PageHeader
          title={createdId < 0 ? "Saved on this phone" : "Camp added"}
          subtitle={
            createdId < 0
              ? "You're offline — this camp will upload when you're back online."
              : `${name} is now part of ${farm?.name}.`
          }
        />
        <Card>
          <CardTitle>What next?</CardTitle>
          {createdId > 0 ? (
            <>
              <Button
                title="Run an assessment"
                icon="sparkles-outline"
                onPress={() => router.replace({ pathname: "/(tabs)/assess", params: { camp: String(createdId) } })}
              />
              <Button
                title="Ask Vision about it"
                variant="secondary"
                onPress={() => router.replace({ pathname: "/(tabs)/ask", params: { camp: String(createdId) } })}
              />
              <Button title="Open camp" variant="outline" onPress={() => router.replace(`/camp/${createdId}`)} />
            </>
          ) : (
            <Button title="Back to camps" onPress={() => router.replace("/(tabs)/camps")} />
          )}
        </Card>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <PageHeader
        title="Add a camp"
        subtitle="Size and location make the advice much more accurate."
        onBack={() => router.back()}
      />

      <Card>
        <CardTitle>Camp details</CardTitle>
        <Label>Name</Label>
        <Field value={name} onChangeText={setName} placeholder="e.g. North Camp" />
        <Label>Region</Label>
        <Field value={region} onChangeText={setRegion} placeholder="e.g. Otjozondjupa" />
        <Label>Area (hectares)</Label>
        <Field value={areaHa} onChangeText={setAreaHa} keyboardType="decimal-pad" placeholder="e.g. 1200" />
      </Card>

      <Card>
        <CardTitle>Location</CardTitle>
        <Text style={styles.help}>
          Coordinates let Vision pull live rainfall and match nearby research plots.
        </Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Label>Latitude</Label>
            <Field value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="-19.52" />
          </View>
          <View style={styles.col}>
            <Label>Longitude</Label>
            <Field value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="17.92" />
          </View>
        </View>
        <UseMyLocationButton
          onLocated={(lat, lon) => {
            setLatitude(String(lat));
            setLongitude(String(lon));
          }}
        />
      </Card>

      <Card>
        <CardTitle>Livestock</CardTitle>
        <Label>Cattle</Label>
        <Field value={cattle} onChangeText={setCattle} keyboardType="number-pad" />
        <Label>Goats</Label>
        <Field value={goats} onChangeText={setGoats} keyboardType="number-pad" />
        <Label>Sheep</Label>
        <Field value={sheep} onChangeText={setSheep} keyboardType="number-pad" />
        <Label>Grazing start date</Label>
        <Field value={grazingStart} onChangeText={setGrazingStart} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Toggle
          label="Part of a rotational grazing plan"
          value={rotational}
          onChange={setRotational}
        />
      </Card>

      <Card>
        <CardTitle>Observations</CardTitle>
        <TextArea
          value={observations}
          onChangeText={setObservations}
          placeholder="What does the veld look like right now?"
        />
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button title="Save camp" onPress={save} loading={saving} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.veld[700],
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
});
