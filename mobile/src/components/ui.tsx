import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontFamily, palette, radii } from "../lib/theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function ScreenScroll({
  children,
  contentStyle,
}: {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          { paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 40 },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={colors.subtle} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={palette.veld[400]} {...props} style={[styles.input, props.style]} />;
}

export function TextArea(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={palette.veld[400]}
      multiline
      textAlignVertical="top"
      {...props}
      style={[styles.input, styles.textarea, props.style]}
    />
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "lg" | "md";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const tone = BUTTON_TONES[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        size === "md" ? styles.btnMd : styles.btnLg,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderWidth: tone.border === "transparent" ? 0 : 1,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={size === "md" ? 15 : 17} color={tone.fg} /> : null}
          <Text style={[styles.btnText, { color: tone.fg, fontSize: size === "md" ? 14 : 15 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const BUTTON_TONES = {
  primary: { bg: palette.veld[600], fg: palette.white, border: "transparent" },
  secondary: { bg: palette.sand[100], fg: palette.veld[800], border: palette.sand[200] },
  outline: { bg: palette.white, fg: palette.veld[700], border: palette.veld[200] },
  ghost: { bg: "transparent", fg: palette.veld[700], border: "transparent" },
} as const;

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function CardStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? palette.veld[600] : palette.white,
          borderColor: active ? palette.veld[600] : palette.sand[300],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? palette.sand[50] : palette.veld[800] }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}>
      <View style={[styles.checkbox, value && { backgroundColor: palette.veld[600], borderColor: palette.veld[600] }]}>
        {value ? <Ionicons name="checkmark" size={14} color={palette.sand[50]} /> : null}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={palette.veld[600]} size="large" />
      <Text style={styles.centeredText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>Something went wrong</Text>
      <Text style={[styles.body, { marginTop: 6 }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="outline" size="md" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Empty({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.body, { marginTop: 6 }]}>{message}</Text>
      {action}
    </Card>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function BulletList({ items, tone }: { items: string[]; tone?: string }) {
  if (!items?.length) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, tone ? { backgroundColor: tone } : null]} />
          <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 8,
  },
  backText: {
    color: colors.subtle,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: palette.veld[800],
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[700],
    marginTop: 6,
    opacity: 0.85,
  },
  sectionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: palette.veld[600],
    marginBottom: 10,
    marginTop: 20,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: palette.veld[700],
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.sand[200],
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fontFamily.body,
    color: palette.veld[900],
  },
  textarea: {
    minHeight: 92,
    paddingTop: 12,
  },
  btn: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  btnLg: {
    minHeight: 48,
    paddingHorizontal: 20,
  },
  btnMd: {
    minHeight: 44,
    paddingHorizontal: 14,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    fontFamily: fontFamily.bodyBold,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 16,
    marginBottom: 12,
    shadowColor: palette.veld[900],
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: palette.veld[800],
  },
  stat: {
    flex: 1,
    minWidth: 130,
    backgroundColor: palette.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.sand[200],
    padding: 12,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: palette.veld[600],
  },
  statValue: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: palette.veld[800],
    marginTop: 4,
  },
  statHint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: palette.veld[700],
    opacity: 0.8,
    marginTop: 2,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.sand[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
  },
  toggleLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: palette.veld[800],
    flex: 1,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    color: palette.status.concern,
    marginTop: 10,
    fontSize: 13,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  centeredText: {
    fontFamily: fontFamily.bodyMedium,
    color: palette.veld[700],
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: palette.sand[200],
    marginVertical: 14,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.veld[400],
    marginTop: 7,
  },
});
