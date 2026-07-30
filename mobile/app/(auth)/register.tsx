import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";

import { Button, Card, ErrorText, Field, Label, PageHeader, ScreenScroll } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { fontFamily, palette } from "../../src/lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [farmName, setFarmName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        farm_name: farmName.trim() || undefined,
        region: region.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScreenScroll contentStyle={{ paddingTop: 56 }}>
        <PageHeader
          title="Create your account"
          subtitle="One login for the app and the website."
          onBack={() => router.back()}
        />

        <Card>
          <Label>Full name</Label>
          <Field value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Label>Email</Label>
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@farm.na"
          />
          <Label>Password</Label>
          <Field secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />
          <Label>Farm name (optional)</Label>
          <Field value={farmName} onChangeText={setFarmName} placeholder="Otjiwarongo Farm" />
          <Label>Region (optional)</Label>
          <Field value={region} onChangeText={setRegion} placeholder="Otjozondjupa" />
          <ErrorText>{error}</ErrorText>
          <Button title="Create account" onPress={onSubmit} loading={loading} />
          <Link href="/(auth)/login" style={styles.link}>
            Already have an account? Sign in
          </Link>
        </Card>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  link: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: palette.veld[700],
    marginTop: 16,
  },
});
