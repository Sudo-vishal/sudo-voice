"use client";

import { useState } from "react";

// Payments open soon via Lemon Squeezy. Until then every paid CTA routes to
// the free download — a dead checkout link costs more trust than honesty does.
const EARLY_ACCESS_URL = "/#download";
const LS_URLS = {
  proMonthly: EARLY_ACCESS_URL,
  proAnnual: EARLY_ACCESS_URL,
  lifetime: EARLY_ACCESS_URL,
} as const;

type ProEmphasis = "monthly" | "annual";

const Check = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4FC3F7"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 mt-0.5"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type Tier = {
  key: string;
  name: string;
  price: string;
  cadence: string;
  subhead: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "primary" | "ghost";
  ctaDataLs?: "pro-monthly" | "pro-annual" | "lifetime";
  refundNote?: string;
  highlightOn: "always" | "annual" | "monthly" | "never";
  scarcity?: string;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    subhead: "For everyone. Get started in 60 seconds.",
    bullets: [
      "60 minutes/day local transcription",
      "Tiny + Base Whisper models",
      "3 LLM cleanups/day (Groq)",
      "Basic voice commands",
      "Auto-type to any app",
      "Smart punctuation",
      "1 device",
    ],
    ctaLabel: "Download Free",
    ctaHref: "/",
    ctaVariant: "ghost",
    highlightOn: "never",
  },
  {
    key: "pro-monthly",
    name: "Pro Monthly",
    price: "$12",
    cadence: "/month",
    subhead: "For power users. Pay as you go.",
    bullets: [
      "Unlimited transcription",
      "All 5 Whisper models (Tiny → Large V3)",
      "All 7 LLM providers",
      "Gemini Live streaming",
      "Batch file transcription",
      "Custom voice commands",
      "3 devices",
    ],
    ctaLabel: "Free in Early Access",
    ctaHref: LS_URLS.proMonthly,
    ctaVariant: "primary",
    ctaDataLs: "pro-monthly",
    refundNote: "30-day money-back",
    highlightOn: "monthly",
  },
  {
    key: "pro-annual",
    name: "Pro Annual",
    price: "$99",
    cadence: "/year",
    subhead: "Same as Pro Monthly. Save 31% ($45/yr).",
    bullets: [
      "Everything in Pro Monthly",
      "$99/yr vs $144/yr — save $45",
      "Unlimited transcription",
      "All 5 models + 7 LLM providers",
      "Gemini Live + batch processing",
      "3 devices",
    ],
    ctaLabel: "Free in Early Access",
    ctaHref: LS_URLS.proAnnual,
    ctaVariant: "primary",
    ctaDataLs: "pro-annual",
    refundNote: "30-day money-back",
    highlightOn: "annual",
  },
  {
    key: "lifetime",
    name: "Lifetime",
    price: "$249",
    cadence: "once",
    subhead: "Pay once. Use forever.",
    bullets: [
      "Everything in Pro, forever",
      "All future updates included",
      "5 devices",
      "No subscription, ever",
    ],
    ctaLabel: "Free in Early Access",
    ctaHref: LS_URLS.lifetime,
    ctaVariant: "primary",
    ctaDataLs: "lifetime",
    refundNote: "30-day money-back",
    highlightOn: "never",
    scarcity: "First 100 buyers only",
  },
];

export default function PricingTiers() {
  const [emphasis, setEmphasis] = useState<ProEmphasis>("annual");

  const isHighlighted = (tier: Tier) =>
    tier.highlightOn === "always" ||
    (tier.highlightOn === "annual" && emphasis === "annual") ||
    (tier.highlightOn === "monthly" && emphasis === "monthly");

  return (
    <section id="pricing-tiers" className="py-16 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold">Pricing</h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl mx-auto">
            Free for life. Paid when you need more.
          </p>
        </div>

        {/* Annual/Monthly toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setEmphasis("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                emphasis === "monthly"
                  ? "bg-[#4FC3F7] text-black"
                  : "text-[#8FA3BF] hover:text-white"
              }`}
              aria-pressed={emphasis === "monthly"}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setEmphasis("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                emphasis === "annual"
                  ? "bg-[#4FC3F7] text-black"
                  : "text-[#8FA3BF] hover:text-white"
              }`}
              aria-pressed={emphasis === "annual"}
            >
              Annual
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  emphasis === "annual"
                    ? "bg-black/15 text-black"
                    : "bg-[#4FC3F7]/15 text-[#4FC3F7]"
                }`}
              >
                save 31%
              </span>
            </button>
          </div>
        </div>

        {/* 4-card grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {TIERS.map((tier) => {
            const highlighted = isHighlighted(tier);
            const isExternal = tier.ctaHref.startsWith("http");
            return (
              <div
                key={tier.key}
                id={tier.key}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  highlighted
                    ? "border-[#4FC3F7]/50 bg-[#4FC3F7]/[0.04] shadow-[0_0_40px_rgba(79, 195, 247,0.15)]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#4FC3F7] text-black text-xs font-semibold whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8FA3BF]">
                  {tier.name}
                </h3>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-[#4FC3F7]">{tier.price}</span>
                  <span className="text-sm text-[#5C6E8A]">{tier.cadence}</span>
                </div>

                <p className="mt-3 text-sm text-[#8FA3BF] min-h-[40px]">{tier.subhead}</p>

                {tier.scarcity && (
                  <div className="mt-2 inline-flex self-start items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#4FC3F7]/30 bg-[#4FC3F7]/[0.06] text-[10px] font-medium text-[#4FC3F7] uppercase tracking-wider">
                    {tier.scarcity}
                  </div>
                )}

                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-[#E2E8F0]">
                      <Check />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.ctaHref}
                  {...(tier.ctaDataLs ? { "data-ls-product": tier.ctaDataLs } : {})}
                  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`mt-6 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    tier.ctaVariant === "primary"
                      ? "bg-[#4FC3F7] text-black hover:bg-[#4FC3F7]/90"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  {tier.ctaLabel}
                </a>

                {tier.refundNote && (
                  <div className="mt-3 text-xs text-[#5C6E8A] text-center">
                    {tier.refundNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
