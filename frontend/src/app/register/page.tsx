"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { VisionLogo } from "@/components/vision-logo";

/** Livestock on pasture — not produce imagery. */
const REGISTER_IMAGE = "/images/cattle-close.jpg";

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [farmName, setFarmName] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        farm_name: farmName.trim() || undefined,
        region: region.trim() || undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div
        className="relative hidden min-h-[40vh] flex-1 bg-cover bg-center md:block"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(29,59,38,0.78), rgba(47,93,58,0.4)), url(${REGISTER_IMAGE})`,
        }}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-10 py-6">
          <Link href="/" className="font-display text-2xl font-bold text-white transition hover:text-sand-100">
            Vision
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Link href="/" className="font-display text-4xl font-bold transition hover:text-sand-100">
            Vision
          </Link>
          <p className="mt-2 max-w-sm text-sand-100/90">
            Create your account, add camps, and start getting grazing guidance.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-rise">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-veld-700/80 transition hover:text-veld-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <VisionLogo size={40} />
            <span className="font-display text-2xl font-bold text-veld-800">Vision</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold text-veld-800">Create your account</h1>
          <p className="mt-2 text-veld-700/75">Takes under a minute. Large, clear fields — easy on a phone.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="full_name">
                Your name
              </label>
              <input
                id="full_name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Nangolo"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="farm_name">
                Farm name <span className="font-normal text-veld-600/60">(optional)</span>
              </label>
              <input
                id="farm_name"
                className="input"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Omuramba Farm"
              />
            </div>
            <div>
              <label className="label" htmlFor="region">
                Region <span className="font-normal text-veld-600/60">(optional)</span>
              </label>
              <input
                id="region"
                className="input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Otjozondjupa"
              />
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{error}</div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-veld-700/80">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-veld-700 underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
