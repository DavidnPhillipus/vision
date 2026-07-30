"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

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
          backgroundImage:
            "linear-gradient(160deg, rgba(29,59,38,0.78), rgba(47,93,58,0.4)), url(https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1400&q=80)",
        }}
      >
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-display text-4xl font-bold">Vision</p>
          <p className="mt-2 max-w-sm text-sand-100/90">
            Create your account, add camps, and start getting grazing guidance.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-rise">
          <Link href="/" className="mb-8 flex items-center gap-2 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-veld-600 text-white">
              <Sprout className="h-5 w-5" />
            </span>
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
