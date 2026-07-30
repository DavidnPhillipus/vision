"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in">
      <div className="min-w-0 max-w-2xl">
        {backHref ? (
          <Link href={backHref} className="mb-2 inline-block text-sm font-medium text-veld-600/70 hover:text-veld-700 hover:underline">
            ← {backLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.14em] text-veld-600/70">{eyebrow}</p> : null}
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-veld-800 md:text-4xl">{title}</h1>
        {description ? <div className="mt-2 text-base leading-relaxed text-veld-700/80 md:text-lg">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display text-xl font-semibold text-veld-800 md:text-2xl", className)}>{children}</h2>
  );
}

export function SoftPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-sand-200/80 backdrop-blur-sm md:p-6", className)}>
      {children}
    </div>
  );
}
