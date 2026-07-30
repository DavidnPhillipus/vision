"use client";

import * as React from "react";
import { Loader2, Check } from "lucide-react";
import { ASSESS_PROGRESS_STAGES } from "@vision/shared";

export function AssessmentProgress() {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, ASSESS_PROGRESS_STAGES.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mx-auto max-w-md space-y-2 py-8">
      {ASSESS_PROGRESS_STAGES.map((s, i) => (
        <div
          key={s}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
            i === active ? "bg-veld-50 ring-1 ring-veld-100" : ""
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-sand-200">
            {i < active ? (
              <Check className="h-4 w-4 text-status-good" />
            ) : i === active ? (
              <Loader2 className="h-4 w-4 animate-spin text-veld-600" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-sand-300" />
            )}
          </span>
          <span className={`text-sm ${i <= active ? "font-medium text-veld-800" : "text-veld-600/45"}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}
