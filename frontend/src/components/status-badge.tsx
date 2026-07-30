import { cn, statusColor } from "@/lib/utils";

export function StatusBadge({ status, size = "md" }: { status?: string | null; size?: "sm" | "md" | "lg" }) {
  const c = statusColor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold ring-1",
        c.bg,
        c.text,
        c.ring,
        size === "lg" && "px-4 py-1.5 text-base",
        size === "md" && "px-3 py-1 text-sm",
        size === "sm" && "px-2.5 py-0.5 text-xs",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", c.dot)} />
      {status || "Not assessed"}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-veld-50 px-2.5 py-0.5 text-xs font-medium text-veld-700 ring-1 ring-veld-100">
      Confidence: {confidence}
    </span>
  );
}
