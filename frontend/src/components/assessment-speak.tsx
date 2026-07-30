"use client";

import * as React from "react";
import { SpeakButton } from "@/components/speech-controls";
import { useTextToSpeech } from "@/hooks/use-speech";

export function AssessmentSpeak({
  status,
  answer,
  recommendation,
}: {
  status: string;
  answer?: string | null;
  recommendation?: string | null;
}) {
  const tts = useTextToSpeech({ lang: "en-GB", rate: 0.95 });

  const script = React.useMemo(() => {
    const parts = [
      `Assessment status: ${status}.`,
      answer ? `Vision says: ${answer}` : "",
      recommendation ? `Main recommendation: ${recommendation}` : "",
    ].filter(Boolean);
    return parts.join(" ");
  }, [status, answer, recommendation]);

  if (!script.trim()) return null;

  return (
    <SpeakButton
      speaking={tts.speaking}
      supported={tts.supported}
      onClick={() => {
        if (tts.speaking) tts.stop();
        else tts.speak(script);
      }}
      label="Listen to result"
      className="mt-3"
    />
  );
}
