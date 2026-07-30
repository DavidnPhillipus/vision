import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card rounded-2xl p-5 md:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-veld-600/80", className)}
      {...props}
    />
  );
}

export function CardStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-veld-600/80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-veld-800">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-veld-600/70">{sub}</p> : null}
    </div>
  );
}
