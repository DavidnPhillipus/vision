import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Matches the website mic: Web Speech API when running Expo web.
 * Native Expo Go has no built-in STT — listening stays unsupported there.
 */
export function useSpeechToText(onFinal: (text: string) => void) {
  const [supported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onresult = (ev) => {
      let interimText = "";
      let finalText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        setInterim("");
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  useEffect(() => () => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, listening, interim, start, stop, toggle: () => (listening ? stop() : start()) };
}
