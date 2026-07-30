import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, fontFamily, palette } from "../../src/lib/theme";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  ask: "chatbubble-ellipses-outline",
  camps: "map-outline",
  assess: "clipboard-outline",
  compare: "git-compare-outline",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.veld[700],
        tabBarInactiveTintColor: palette.veld[600],
        tabBarStyle: {
          backgroundColor: palette.sand[50],
          borderTopColor: palette.sand[200],
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.bodySemi },
        sceneContainerStyle: { backgroundColor: colors.page },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name] || "ellipse-outline"} size={size} color={color} />
        ),
      })}
    >
      {/* Order matches the website nav: Home, Ask, Camps, Assess, Compare. */}
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
      <Tabs.Screen name="camps" options={{ title: "Camps" }} />
      <Tabs.Screen name="assess" options={{ title: "Assess" }} />
      <Tabs.Screen name="compare" options={{ title: "Compare" }} />
    </Tabs>
  );
}
