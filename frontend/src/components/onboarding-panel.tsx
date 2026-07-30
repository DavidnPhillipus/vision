"use client";

import Link from "next/link";
import { PlusCircle, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingPanel({ farmName }: { farmName: string }) {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="inline-flex items-center gap-2 text-sm text-veld-600/65">
          <Sparkles className="h-4 w-4" /> {farmName}
        </p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-veld-900">
          Add your first camp to begin
        </h2>
        <p className="mt-3 text-base leading-relaxed text-veld-700/75">
          Vision needs a paddock with location and herd numbers before it can assess grazing or compare camps.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/camps/new">
          <Button size="lg">
            <PlusCircle className="h-5 w-5" />
            Add first camp
          </Button>
        </Link>
        <Link href="/advisor">
          <Button variant="outline" size="lg">
            <MessageCircleQuestion className="h-5 w-5" />
            Ask Vision first
          </Button>
        </Link>
      </div>
    </div>
  );
}
