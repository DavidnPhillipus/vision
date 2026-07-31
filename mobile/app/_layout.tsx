import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from "@expo-google-fonts/ibm-plex-sans";
import { IBMPlexSerif_600SemiBold, IBMPlexSerif_700Bold } from "@expo-google-fonts/ibm-plex-serif";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { FarmProvider } from "../src/context/FarmContext";
import { NetworkProvider } from "../src/context/NetworkContext";
import { ConnectivityBanner } from "../src/components/ConnectivityBanner";
import { colors, fontFamily, palette } from "../src/lib/theme";

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      {user ? <ConnectivityBanner /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camp/new" />
        <Stack.Screen name="camp/[id]" />
      </Stack>
      {loading ? (
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={palette.veld[600]} />
          <Text style={styles.splashHint}>Starting Vision…</Text>
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  // Ionicons.font must be loaded explicitly in standalone APKs or tab/icons render blank.
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    IBMPlexSerif_600SemiBold,
    IBMPlexSerif_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });
  // Never block the app forever if brand fonts fail — icon font is included above.
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontWaitExpired(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError) || fontWaitExpired;

  if (!fontsReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={palette.veld[600]} />
        <Text style={styles.splashHint}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <FarmProvider>
            <RootNavigator />
          </FarmProvider>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.page,
    gap: 12,
  },
  splashHint: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: palette.veld[700],
  },
});
