"use client";

import Link from "next/link";
import { ClipboardCheck, PlusCircle, MessageCircleQuestion, GitCompare } from "lucide-react";

const actions = [
  {
    href: "/assess",
    label: "Assess a camp",
    hint: "Status, reasons, next steps",
    icon: ClipboardCheck,
    primary: true,
  },
  {
    href: "/camps/new",
    label: "Add a camp",
    hint: "Pin location & herd",
    icon: PlusCircle,
  },
  {
    href: "/advisor",
    label: "Ask Vision",
    hint: "Type or speak",
    icon: MessageCircleQuestion,
  },
  {
    href: "/compare",
    label: "Compare camps",
    hint: "Who rests first?",
    icon: GitCompare,
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`group flex flex-col items-start gap-3 rounded-2xl p-4 text-left shadow-sm ring-1 transition-all hover:-translate-y-0.5 ${
            a.primary
              ? "bg-veld-600 text-white ring-veld-700 hover:bg-veld-700"
              : "bg-white/90 text-veld-800 ring-sand-200 hover:bg-sand-50"
          }`}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              a.primary ? "bg-white/15" : "bg-veld-50 text-veld-700"
            }`}
          >
            <a.icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">{a.label}</span>
            <span className={`mt-1 block text-xs ${a.primary ? "text-sand-100/80" : "text-veld-600/70"}`}>
              {a.hint}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
