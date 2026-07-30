"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  GitCompare,
  MessageCircleQuestion,
  MapPinned,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useFarm } from "@/components/providers";
import { ConnectivityBanner } from "@/components/connectivity-banner";
import { VisionLogo } from "@/components/vision-logo";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/advisor", label: "Ask", icon: MessageCircleQuestion },
  { href: "/camps", label: "Camps", icon: MapPinned },
  { href: "/assess", label: "Assess", icon: ClipboardCheck },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { farm } = useFarm();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 w-full border-b border-sand-200/80 bg-[#faf7f1]/90 backdrop-blur">
        <ConnectivityBanner />
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <VisionLogo size={36} className="rounded-full" />
            <div className="min-w-0 leading-tight">
              <span className="font-display block text-xl font-semibold tracking-tight text-veld-900">Vision</span>
              <span className="block truncate text-xs text-veld-600/60">{farm?.name || "Advisor"}</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {nav.map((n) => {
              const active =
                pathname === n.href ||
                (n.href !== "/dashboard" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "bg-veld-800 text-white" : "text-veld-700/70 hover:bg-sand-200/60 hover:text-veld-900",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 rounded-full p-2 text-veld-600/60 hover:bg-sand-200/60 hover:text-veld-800"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>

          <button
            type="button"
            className="rounded-full p-2 text-veld-700 hover:bg-sand-200/60 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="space-y-1 border-t border-sand-200/80 px-4 py-3 lg:hidden">
            <p className="px-1 pb-2 text-sm text-veld-600/60">{user?.full_name}</p>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-veld-800 hover:bg-sand-200/50"
              >
                <n.icon className="h-5 w-5 text-veld-600/70" />
                {n.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium text-veld-800 hover:bg-sand-200/50"
            >
              <LogOut className="h-5 w-5 text-veld-600/70" />
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      <main className="w-full flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-8 lg:pb-10 animate-fade-in">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 w-full border-t border-sand-200/80 bg-[#faf7f1]/95 backdrop-blur lg:hidden">
        <div className="flex w-full items-stretch justify-around px-1">
          {nav.map((n) => {
            const active =
              pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium sm:text-[11px]",
                  active ? "text-veld-800" : "text-veld-600/55",
                )}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
