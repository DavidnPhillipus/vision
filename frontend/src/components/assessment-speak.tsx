"use client";

import * as React from "react";
import { forSpeech } from "@vision/shared";
import { SpeakButton } from "@/components/speech-controls";
import { useTextToSpeech } from "@/hooks/use-speech";

/** Speaks only the AI answer (and recommendation if present) — not badges, evidence, weather. */
export function AssessmentSpeak({
  answer,
  recommendation,
}: {
  status?: string;
  answer?: string | null;
  recommendation?: string | null;
}) {
  const tts = useTextToSpeech({ lang: "en-GB", rate: 0.95 });

  const script = React.useMemo(() => {
    const parts = [forSpeech(answer), forSpeech(recommendation)].filter(Boolean);
    return parts.join(" ");
  }, [answer, recommendation]);

  if (!script.trim()) return null;

  return (
    <SpeakButton
      speaking={tts.speaking}
      supported={tts.supported}
      onClick={() => {
        if (tts.speaking) tts.stop();
        else tts.speak(script);
      }}
      label="Listen to answer"
      className="mt-3"
    />
  );
}
