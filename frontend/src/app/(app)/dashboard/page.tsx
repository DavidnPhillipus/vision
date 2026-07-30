"use client";

import { HOME_SUGGESTIONS } from "@vision/shared";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useFarm } from "@/components/providers";
import { useAuth } from "@/components/auth/auth-provider";
import { Loading, ErrorState } from "@/components/states";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { StatusBadge } from "@/components/status-badge";
import { api, type Assessment } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const { farm, camps, loading, error, refresh } = useFarm();
  const router = useRouter();
  const [ask, setAsk] = React.useState("");
  const [latest, setLatest] = React.useState<Assessment | null>(null);

  React.useEffect(() => {
    if (camps.length === 0) return;
    (async () => {
      try {
        const all = await Promise.all(camps.map((c) => api.campAssessments(c.id)));
        const flat = all.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setLatest(flat[0] ?? null);
      } catch {
        /* ignore */
      }
    })();
  }, [camps]);

  if (loading) return <Loading label="Loading your farm…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!farm) return <ErrorState message="No farm found for this account yet." onRetry={refresh} />;

  const firstName = user?.full_name?.split(" ")[0] || "there";

  if (camps.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-8 py-6">
        <div>
          <p className="text-sm text-veld-600/65">Welcome, {firstName}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-veld-900">{farm.name}</h1>
        </div>
        <OnboardingPanel farmName={farm.name} />
      </div>
    );
  }

  function goAsk(text: string) {
    const q = text.trim();
    if (!q) {
      router.push("/advisor");
      return;
    }
    router.push(`/advisor?ask=${encodeURIComponent(q)}`);
  }

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start lg:gap-14">
      <section className="min-w-0 py-2 lg:py-8">
        <p className="text-sm text-veld-600/65">Good to see you, {firstName}</p>
        <h1 className="font-display mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-veld-900 md:text-5xl">
          What do you want to know about your grazing?
        </h1>

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            goAsk(ask);
          }}
        >
          <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-sand-200/90 transition focus-within:ring-veld-300">
            <textarea
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              rows={3}
              placeholder="Ask Vision anything about your camps, herd, or rainfall…"
              className="w-full resize-none bg-transparent px-3 py-3 text-base text-veld-900 placeholder:text-veld-600/40 focus:outline-none md:text-lg"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-1">
              <p className="hidden text-xs text-veld-600/45 sm:block">Uses your farm data + live weather</p>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-veld-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-veld-900"
              >
                Ask Vision
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {HOME_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => goAsk(s)}
              className="rounded-full px-3.5 py-1.5 text-sm text-veld-700/80 ring-1 ring-sand-300/80 transition hover:bg-white hover:text-veld-900"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <aside className="min-w-0 space-y-6 rounded-2xl bg-white/70 p-6 ring-1 ring-sand-200/80 lg:mt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-veld-600/55">Your farm</p>
          <p className="mt-1 font-display text-2xl font-semibold text-veld-900">{farm.name}</p>
          {farm.region ? <p className="mt-1 text-sm text-veld-600/65">{farm.region}</p> : null}
        </div>

        <div className="space-y-3 border-t border-sand-200/80 pt-5 text-sm">
          <Link href="/camps" className="flex items-center justify-between font-medium text-veld-800 hover:underline">
            <span>Camps</span>
            <span className="text-veld-600/60">{camps.length}</span>
          </Link>
          <Link href="/assess" className="block font-medium text-veld-800 hover:underline">
            Run an assessment
          </Link>
          <Link href="/compare" className="block font-medium text-veld-800 hover:underline">
            Compare camps
          </Link>
          <Link href="/camps/new" className="block font-medium text-veld-800 hover:underline">
            Add a camp
          </Link>
        </div>

        {latest ? (
          <div className="border-t border-sand-200/80 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-veld-600/55">Latest advice</p>
            <div className="mt-2">
              <StatusBadge status={latest.status} size="sm" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-veld-800">{latest.recommendation}</p>
            <Link
              href={`/camps/${latest.camp_id}`}
              className="mt-3 inline-block text-sm font-medium text-veld-700 underline"
            >
              Open camp
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
