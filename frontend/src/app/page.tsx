"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, ArrowRight, Mic, CloudRain, MapPinned, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=2000&q=80";
const FIELD_IMAGE =
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=80";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10">
        <div className="flex items-center gap-2.5 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-veld-600/90 backdrop-blur">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">Vision</span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <Button onClick={() => router.push("/dashboard")} className="bg-white text-veld-800 hover:bg-sand-50">
              Open my farm
            </Button>
          ) : (
            <>
              <Link href="/login" className="btn btn-md hidden text-white hover:bg-white/10 sm:inline-flex">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-md bg-white text-veld-800 hover:bg-sand-50">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative flex min-h-[100svh] items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Cattle grazing on open Namibian rangeland"
            className="h-full w-full object-cover animate-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-veld-900 via-veld-900/50 to-veld-900/20" />
        </div>

        <div className="relative z-10 w-full px-5 pb-16 pt-40 md:px-10 md:pb-24">
          <div className="max-w-2xl animate-rise">
            <p className="font-display mb-3 text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
              Vision
            </p>
            <h1 className="max-w-xl text-2xl font-semibold leading-snug text-sand-50 sm:text-3xl md:text-4xl">
              Clear grazing advice for Namibian livestock farmers.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-sand-100/90 sm:text-lg">
              Know which camp needs rest, when to move the herd, and how recent rainfall changes the picture — explained
              in plain language.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-rise-delay">
              <Link href="/register" className="btn btn-lg bg-white text-veld-800 hover:bg-sand-50">
                Start with your farm
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/login" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
                Try demo farm
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-sand-200/80 bg-sand-50/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:grid-cols-3 md:px-10">
          {[
            { icon: MapPinned, title: "Your camps", text: "Location, herd, and grazing days in one place." },
            { icon: CloudRain, title: "Live rainfall", text: "Open-Meteo history and forecast for each pin." },
            { icon: Mic, title: "Voice advisor", text: "Speak questions and hear recommendations aloud." },
          ].map((item, i) => (
            <div
              key={item.title}
              className="flex gap-4 animate-rise"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-veld-600 text-white">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-veld-800">{item.title}</p>
                <p className="mt-1 text-veld-700/75">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-veld-600/70">How Vision works</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-veld-800 md:text-4xl">
            Advice you can act on at the farm gate
          </h2>
          <ol className="mt-8 space-y-6">
            {[
              "Describe each camp: map pin, size, cattle, goats, sheep, and when grazing started.",
              "Vision pulls live rainfall and comparable Namibia rangeland research plots.",
              "You get a status, a main recommendation, reasons, evidence, and honest limitations.",
            ].map((text, i) => (
              <li key={text} className="flex gap-4">
                <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-veld-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 text-lg leading-relaxed text-veld-800">{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-sand-300/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIELD_IMAGE} alt="Open pasture under wide sky" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-sand-200 md:left-8 md:right-auto md:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-veld-600/70">Example guidance</p>
            <p className="mt-1 font-semibold text-veld-800">River Camp · High concern</p>
            <p className="mt-1 text-sm text-veld-700/80">
              Move the herd soon — long stay, dry spell, and exposed soil reported.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-veld-800 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-10 md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Built for real rangeland decisions</h2>
            <p className="mt-3 text-lg text-sand-100/85">
              Vision does not invent biomass numbers. It combines farmer data, live weather, and research plots — then
              tells you what it used and what it cannot know.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Assess",
                text: "Wizard-guided camp checks with optional photos and a clear status.",
              },
              {
                title: "Compare",
                text: "See which camps to rest first and which can still take pressure.",
              },
              {
                title: "Ask Vision",
                text: "Type or speak follow-up questions grounded in your farm context.",
              },
            ].map((item) => (
              <div key={item.title} className="border-t border-white/25 pt-5">
                <h3 className="font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sand-100/80">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn btn-lg bg-white text-veld-800 hover:bg-sand-50">
              Create free account
            </Link>
            <p className="flex items-center gap-2 text-sm text-sand-100/75">
              <ShieldCheck className="h-4 w-4" />
              Demo login: demo@vision.na · vision123
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-200 px-5 py-8 text-center text-sm text-veld-600/70 md:px-10">
        Vision · Deep Learning IndabaX Namibia 2026 · Rangeland &amp; livestock advisory
      </footer>
    </div>
  );
}
