"use client";

import { ASK_SUGGESTIONS, forSpeech, stripMarkdown } from "@vision/shared";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { useFarm } from "@/components/providers";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MicButton, SpeakButton } from "@/components/speech-controls";
import { VisionLogo } from "@/components/vision-logo";
import { useSpeechToText, useTextToSpeech } from "@/hooks/use-speech";

type Msg = { role: "user" | "assistant"; content: string };

export default function AdvisorPage() {
  return (
    <Suspense fallback={null}>
      <AdvisorChat />
    </Suspense>
  );
}

function AdvisorChat() {
  const { farm, camps } = useFarm();
  const search = useSearchParams();
  const askParam = search.get("ask");
  const [campId, setCampId] = React.useState<number | null>(search.get("camp") ? Number(search.get("camp")) : null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [activeSpeakIndex, setActiveSpeakIndex] = React.useState<number | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const askedRef = React.useRef(false);

  const tts = useTextToSpeech({ lang: "en-GB", rate: 0.95 });
  const stt = useSpeechToText({
    lang: "en-NA",
    onFinal: (text) => {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    },
  });

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, stt.interim]);

  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const busyRef = React.useRef(busy);
  busyRef.current = busy;

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busyRef.current) return;
    stt.stop();
    tts.stop();
    setActiveSpeakIndex(null);

    const history = messagesRef.current.slice(-8);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.chat({
        farm_id: farm?.id,
        camp_id: campId ?? undefined,
        message: msg,
        history,
      });
      setMessages((m) => {
        const reply = stripMarkdown(res.reply);
        const next = [...m, { role: "assistant" as const, content: reply }];
        if (tts.autoSpeak && tts.supported) {
          queueMicrotask(() => {
            setActiveSpeakIndex(next.length - 1);
            // Speak only the AI reply — not labels, suggestions, or other UI text.
            tts.speak(forSpeech(reply));
          });
        }
        return next;
      });
    } catch (e) {
      const errText = e instanceof Error ? `Sorry — ${e.message}` : "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: errText }]);
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (!askParam || askedRef.current) return;
    askedRef.current = true;
    void send(askParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot bootstrap from home composer
  }, [askParam]);

  function toggleSpeakMessage(index: number, content: string) {
    if (activeSpeakIndex === index && tts.speaking) {
      tts.stop();
      setActiveSpeakIndex(null);
      return;
    }
    setActiveSpeakIndex(index);
    tts.speak(forSpeech(content));
  }

  const displayInput = stt.listening && stt.interim ? `${input}${input ? " " : ""}${stt.interim}` : input;
  const hasThread = messages.length > 0 || busy;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-5xl flex-col lg:min-h-[calc(100vh-7rem)]">
      {!hasThread ? (
        <div className="flex flex-1 flex-col justify-center py-6 lg:py-16">
          <div className="flex items-center gap-3 md:gap-4">
            <VisionLogo size={64} className="rounded-2xl shadow-sm ring-1 ring-sand-200" />
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-veld-900 md:text-5xl">
                Ask Vision
              </h1>
              <p className="mt-1 max-w-lg text-veld-600/70 md:mt-2">
                Plain-language grazing advice from your camps, live rainfall, and research data.
              </p>
            </div>
          </div>

          {camps.length === 0 ? (
            <p className="mt-6 text-sm text-veld-700/75">
              Tip:{" "}
              <Link href="/camps/new" className="font-medium underline">
                add a camp
              </Link>{" "}
              for more accurate answers.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <label className="text-veld-600/60">Looking at</label>
              <select
                className="rounded-full border-0 bg-white px-3 py-2 text-sm font-medium text-veld-800 ring-1 ring-sand-200"
                value={campId ?? ""}
                onChange={(e) => setCampId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Whole farm</option>
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-veld-600/70">
                <input
                  type="checkbox"
                  className="rounded border-sand-300"
                  checked={tts.autoSpeak}
                  onChange={(e) => tts.setAutoSpeak(e.target.checked)}
                  disabled={!tts.supported}
                />
                Read aloud
              </label>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            {ASK_SUGGESTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void send(p)}
                className="rounded-full px-3.5 py-2 text-sm text-veld-700/80 ring-1 ring-sand-300/80 hover:bg-white"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <VisionLogo size={36} className="rounded-xl ring-1 ring-sand-200" />
            <h1 className="font-display text-2xl font-semibold text-veld-900">Ask Vision</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select
              className="rounded-full border-0 bg-white px-3 py-1.5 text-sm font-medium text-veld-800 ring-1 ring-sand-200"
              value={campId ?? ""}
              onChange={(e) => setCampId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Whole farm</option>
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-veld-600/70">
              <input
                type="checkbox"
                className="rounded border-sand-300"
                checked={tts.autoSpeak}
                onChange={(e) => tts.setAutoSpeak(e.target.checked)}
              />
              Read aloud
            </label>
            {tts.speaking ? (
              <button type="button" className="font-medium text-veld-700 underline" onClick={() => { tts.stop(); setActiveSpeakIndex(null); }}>
                Stop
              </button>
            ) : null}
          </div>
        </div>
      )}

      {hasThread ? (
        <div className="flex-1 space-y-4 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex items-start gap-2.5"}>
              {m.role === "assistant" ? (
                <VisionLogo size={32} className="mt-0.5 rounded-lg ring-1 ring-sand-200" />
              ) : null}
              <div
                className={`max-w-[90%] whitespace-pre-wrap text-[15px] leading-relaxed md:max-w-[85%] ${
                  m.role === "user"
                    ? "rounded-2xl bg-veld-800 px-4 py-3 text-white"
                    : "rounded-2xl bg-white px-4 py-3 text-veld-900 ring-1 ring-sand-200/80"
                }`}
              >
                {m.role === "assistant" ? (
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-veld-600/55">Vision</p>
                ) : null}
                {m.content}
                {m.role === "assistant" ? (
                  <div className="mt-3">
                    <SpeakButton
                      speaking={tts.speaking && activeSpeakIndex === i}
                      supported={tts.supported}
                      onClick={() => toggleSpeakMessage(i, m.content)}
                      label="Listen"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2.5 text-sm text-veld-600/55">
              <VisionLogo size={28} className="rounded-lg opacity-90 ring-1 ring-sand-200" />
              Vision is thinking…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : null}

      {stt.error ? <p className="mb-2 text-sm text-amber-800">{stt.error}</p> : null}
      {stt.listening ? (
        <p className="mb-2 text-sm text-veld-700/70">
          Listening…{stt.interim ? ` “${stt.interim}”` : ""}
        </p>
      ) : null}

      <form
        className="sticky bottom-20 mt-auto md:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-sand-200/90 focus-within:ring-veld-300">
          <div className="flex items-end gap-2">
            <VisionLogo size={36} className="mb-1.5 ml-1 hidden rounded-lg ring-1 ring-sand-200 sm:block" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base text-veld-900 placeholder:text-veld-600/40 focus:outline-none"
              value={displayInput}
              onChange={(e) => {
                if (!stt.listening) setInput(e.target.value);
              }}
              placeholder="Message Vision…"
              aria-label="Question for Vision"
            />
            <MicButton listening={stt.listening} supported={stt.supported} onClick={stt.toggle} disabled={busy} className="!rounded-full" />
            <Button type="submit" disabled={busy || !input.trim()} className="rounded-full px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
