import { Ionicons } from "@expo/vector-icons";
import { ADVISOR_GREETING, ASK_SUGGESTIONS } from "@vision/shared";
import * as Speech from "expo-speech";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, Field, Toggle } from "../../src/components/ui";
import { useFarm } from "../../src/context/FarmContext";
import { useNetwork } from "../../src/context/NetworkContext";
import { useSpeechToText } from "../../src/hooks/useSpeechToText";
import { api } from "../../src/lib/api";
import { colors, fontFamily, palette, radii } from "../../src/lib/theme";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: ADVISOR_GREETING,
};

export default function AskScreen() {
  const params = useLocalSearchParams<{ ask?: string; camp?: string }>();
  const insets = useSafeAreaInsets();
  const { farm, camps } = useFarm();
  const { online } = useNetwork();

  const [campId, setCampId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const seeded = useRef<string | null>(null);

  const stt = useSpeechToText((text) => {
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  });

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      if (!online) {
        setMessages((m) => [
          ...m,
          { role: "user", content: message },
          {
            role: "assistant",
            content:
              "You're offline right now. You can still browse saved camps and past assessments — Ask needs a connection for AI advice.",
          },
        ]);
        setInput("");
        return;
      }
      stt.stop();
      setInput("");
      const next: Msg[] = [...messages, { role: "user", content: message }];
      setMessages(next);
      setSending(true);
      try {
        const history = next.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
        const res = await api.chat({
          farm_id: campId ? undefined : farm?.id,
          camp_id: campId ?? undefined,
          message,
          history,
        });
        setMessages([...next, { role: "assistant", content: res.reply }]);
        if (readAloud) Speech.speak(res.reply, { language: "en-GB" });
      } catch (e) {
        setMessages([
          ...next,
          { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, campId, farm?.id, readAloud, stt, online],
  );

  useEffect(() => {
    const preselect = typeof params.camp === "string" ? Number(params.camp) : NaN;
    if (!Number.isNaN(preselect) && preselect > 0) setCampId(preselect);
  }, [params.camp]);

  useEffect(() => {
    const ask = typeof params.ask === "string" ? params.ask : "";
    if (ask && seeded.current !== ask) {
      seeded.current = ask;
      void send(ask);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ask]);

  const displayInput = stt.listening && stt.interim ? `${input}${input ? " " : ""}${stt.interim}` : input;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Ask Vision</Text>
        <Text style={styles.subtitle}>Same advisor and same farm data as the website.</Text>

        <View style={styles.scopeRow}>
          <Chip label="Whole farm" active={campId === null} onPress={() => setCampId(null)} />
          {camps.map((c) => (
            <Chip key={c.id} label={c.name} active={campId === c.id} onPress={() => setCampId(c.id)} />
          ))}
        </View>

        <Toggle label="Read answers aloud" value={readAloud} onChange={setReadAloud} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            messages.length <= 1 ? (
              <View style={styles.presets}>
                {ASK_SUGGESTIONS.map((p) => (
                  <Pressable key={p} onPress={() => send(p)} style={styles.preset}>
                    <Text style={styles.presetText}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.role === "user";
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && { color: palette.sand[50] }]}>{item.content}</Text>
                {!mine ? (
                  <Pressable
                    onPress={() => Speech.speak(item.content, { language: "en-GB" })}
                    style={styles.listen}
                  >
                    <Ionicons name="volume-medium-outline" size={14} color={palette.veld[600]} />
                    <Text style={styles.listenText}>Listen</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          {stt.supported ? (
            <Pressable
              onPress={stt.toggle}
              style={[styles.micBtn, stt.listening && styles.micBtnActive]}
              accessibilityLabel="Dictate"
            >
              <Ionicons
                name={stt.listening ? "mic" : "mic-outline"}
                size={20}
                color={stt.listening ? palette.sand[50] : palette.veld[700]}
              />
            </Pressable>
          ) : null}
          <Field
            value={displayInput}
            onChangeText={setInput}
            placeholder="Ask about your camps…"
            multiline
            style={styles.composerInput}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
          >
            {sending ? (
              <ActivityIndicator color={palette.sand[50]} size="small" />
            ) : (
              <Ionicons name="arrow-up" size={18} color={palette.sand[50]} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.sand[200],
    backgroundColor: palette.sand[50],
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 26,
    color: palette.veld[900],
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: palette.veld[600],
    marginTop: 4,
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  bubble: {
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    maxWidth: "90%",
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: palette.veld[700],
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.sand[200],
  },
  bubbleText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.veld[800],
  },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  listenText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: palette.veld[600],
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  preset: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.sand[300],
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: palette.white,
  },
  presetText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: palette.veld[700],
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: palette.sand[200],
    backgroundColor: palette.sand[50],
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
  },
  micBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: palette.sand[300],
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: palette.veld[700],
    borderColor: palette.veld[700],
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.veld[700],
    alignItems: "center",
    justifyContent: "center",
  },
});
