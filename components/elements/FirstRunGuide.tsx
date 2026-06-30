"use client";

import { Card } from "@heroui/react";
import {
  IconArrowsExchange,
  IconCompass,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "skillswap.guideDismissed";

const STEPS = [
  {
    icon: IconCompass,
    title: "Find a match",
    text: "Browse people who teach what you want to learn - and want to learn what you teach.",
  },
  {
    icon: IconArrowsExchange,
    title: "Request & accept",
    text: "Pick the exact skills to exchange and send a request; once accepted, the swap is live.",
  },
  {
    icon: IconShieldCheck,
    title: "Exchange & verify",
    text: "Trade deliverables, confirm completion, then anchor the proof on Cardano.",
  },
];

/** Dismissible 3-step explainer shown on the dashboard until first dismissed. */
export default function FirstRunGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  return (
    <Card className="relative bg-surface border border-border rounded-2xl p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss guide"
        className="absolute top-3 right-3 text-muted hover:text-foreground transition-colors"
      >
        <IconX size={16} />
      </button>

      <h2 className="text-base font-semibold text-foreground">
        How SkillSwap works
      </h2>
      <p className="text-sm text-muted mt-0.5 mb-4">
        Three steps from match to verified, on-chain proof.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-3">
            <div className="size-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {i + 1}. {s.title}
              </p>
              <p className="text-xs text-muted leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
