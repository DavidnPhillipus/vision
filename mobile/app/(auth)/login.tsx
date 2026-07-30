import { Link } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { Button, Card, ErrorText, Field, Label, ScreenScroll } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { API_BASE } from "../../src/lib/api";
import { fontFamily, palette } from "../../src/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@vision.na");
  const [password, setPassword] = useState("vision123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScreenScroll contentStyle={{ paddingTop: 72 }}>
        <View style={styles.brandRow}>
          <Image source={require("../../assets/icon.png")} style={styles.mark} accessibilityLabel="Vision logo" />
          <Text style={styles.brand}>Vision</Text>
        </View>
        <Text style={styles.headline}>Grazing advice you can act on.</Text>
        <Text style={styles.tagline}>
          Sign in with the same account you use on the website — your farm, camps and history come with you.
        </Text>

        <Card>
          <Label>Email</Label>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@farm.na"
          />
          <Label>Password</Label>
          <Field secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          <ErrorText>{error}</ErrorText>
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
        </Card>

        <Card>
          <Text style={styles.demoTitle}>Demo farm</Text>
          <Text style={styles.demoBody}>demo@vision.na · vision123</Text>
        </Card>

        <Text style={styles.api}>API: {API_BASE}</Text>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  brand: {
    fontFamily: fontFamily.displayBold,
    fontSize: 26,
    color: palette.veld[900],
  },
  headline: {
    fontFamily: fontFamily.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: palette.veld[900],
    marginTop: 24,
  },
  tagline: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
    color: palette.veld[700],
    marginTop: 10,
    marginBottom: 22,
  },
  link: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: palette.veld[700],
    marginTop: 16,
  },
  demoTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: palette.veld[800],
  },
  demoBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[700],
    marginTop: 4,
  },
  api: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: palette.veld[600],
    opacity: 0.6,
    marginTop: 12,
  },
});
