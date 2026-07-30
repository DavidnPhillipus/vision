"use client";

import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function MicButton({
  listening,
  supported,
  onClick,
  disabled,
  className,
}: {
  listening: boolean;
  supported: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !supported}
      title={
        !supported
          ? "Voice input needs Chrome or Edge"
          : listening
            ? "Stop listening"
            : "Speak your question"
      }
      aria-label={listening ? "Stop listening" : "Speak your question"}
      className={cn(
        "btn btn-md shrink-0",
        listening
          ? "bg-clay-500 text-white hover:bg-clay-600 ring-2 ring-clay-400/40 animate-pulse"
          : "btn-outline",
        className,
      )}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      <span className="hidden sm:inline">{listening ? "Listening…" : "Speak"}</span>
    </button>
  );
}

export function SpeakButton({
  speaking,
  supported,
  onClick,
  disabled,
  label = "Listen",
  className,
}: {
  speaking: boolean;
  supported: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !supported}
      title={!supported ? "Spoken replies need a browser with speech support" : speaking ? "Stop speaking" : label}
      aria-label={speaking ? "Stop speaking" : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        speaking
          ? "bg-veld-600 text-white"
          : "bg-white text-veld-700 ring-1 ring-sand-200 hover:bg-sand-50",
        className,
      )}
    >
      {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {speaking ? "Stop" : label}
    </button>
  );
}
