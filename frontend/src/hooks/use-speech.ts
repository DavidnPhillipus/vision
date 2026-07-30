"use client";

import * as React from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechToText(opts?: {
  lang?: string;
  onFinal?: (text: string) => void;
}) {
  const lang = opts?.lang ?? "en-NA";
  const onFinal = opts?.onFinal;
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = React.useRef(onFinal);
  onFinalRef.current = onFinal;

  React.useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError(null);
    setInterim("");

    // Stop any prior instance
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        setListening(false);
        return;
      }
      if (event.error === "not-allowed") {
        setError("Microphone permission blocked. Allow mic access to speak to Vision.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Please try again.");
      setListening(false);
    }
  }, [lang]);

  const toggle = React.useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { supported, listening, interim, error, start, stop, toggle, setError };
}

export function useTextToSpeech(opts?: { lang?: string; rate?: number }) {
  const lang = opts?.lang ?? "en-NA";
  const rate = opts?.rate ?? 0.95;
  const [supported, setSupported] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [autoSpeak, setAutoSpeak] = React.useState(true);

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = React.useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = text.replace(/[*#_>`]/g, " ").replace(/\s+/g, " ").trim();
      if (!clean) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      // Prefer English; fall back if en-NA voice is unavailable.
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      // Prefer a natural English voice when available.
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang === "en-NA") ||
        voices.find((v) => v.lang.startsWith("en-ZA")) ||
        voices.find((v) => v.lang.startsWith("en-GB")) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    },
    [lang, rate],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Chrome loads voices asynchronously.
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  return { supported, speaking, autoSpeak, setAutoSpeak, speak, stop };
}
