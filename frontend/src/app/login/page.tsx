"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { VisionLogo } from "@/components/vision-logo";

const LOGIN_IMAGE = "/images/cattle-pasture.jpg";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("demo@vision.na");
  const [password, setPassword] = React.useState("vision123");
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
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div
        className="relative hidden min-h-[40vh] flex-1 bg-cover bg-center md:block"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(29,59,38,0.75), rgba(29,59,38,0.35)), url(${LOGIN_IMAGE})`,
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
          <p className="mt-2 max-w-sm text-sand-100/90">Sign in to assess camps and get practical grazing advice.</p>
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

          <h1 className="font-display text-3xl font-semibold text-veld-800">Welcome back</h1>
          <p className="mt-2 text-veld-700/75">Sign in to open your farm dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{error}</div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-veld-50 p-4 text-sm text-veld-800 ring-1 ring-veld-100">
            <p className="font-semibold">Try the demo farm</p>
            <p className="mt-1 text-veld-700/80">
              Email <span className="font-medium">demo@vision.na</span> · Password{" "}
              <span className="font-medium">vision123</span>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-veld-700/80">
            New to Vision?{" "}
            <Link href="/register" className="font-semibold text-veld-700 underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
