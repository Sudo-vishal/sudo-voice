"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Reveal from "./Reveal";
import Spotlight from "./Spotlight";
import { startCheckout } from "@/app/lib/checkout";

// Paid CTAs go through /api/checkout (Razorpay). While payment keys aren't
// configured the API answers 503 and the buttons render an honest
// "payments launching soon" state instead of a dead link.
type PaidPlan = "pro-monthly" | "pro-annual" | "lifetime";

type ProEmphasis = "monthly" | "annual";

const Check = () => (
  <span className="font-mono text-[13px] text-[#00E676] shrink-0 mt-0.5" aria-hidden="true">
    [x]
  </span>
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
    name: "free",
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
    name: "pro --monthly",
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
    ctaLabel: "Get Pro Monthly",
    ctaHref: "#",
    ctaVariant: "primary",
    ctaDataLs: "pro-monthly",
    refundNote: "30-day money-back",
    highlightOn: "monthly",
  },
  {
    key: "pro-annual",
    name: "pro --annual",
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
    ctaLabel: "Get Pro Annual",
    ctaHref: "#",
    ctaVariant: "primary",
    ctaDataLs: "pro-annual",
    refundNote: "30-day money-back",
    highlightOn: "annual",
  },
  {
    key: "lifetime",
    name: "lifetime",
    price: "$249",
    cadence: "once",
    subhead: "Pay once. Use forever.",
    bullets: [
      "Everything in Pro, forever",
      "All future updates included",
      "5 devices",
      "No subscription, ever",
    ],
    ctaLabel: "Get Lifetime",
    ctaHref: "#",
    ctaVariant: "primary",
    ctaDataLs: "lifetime",
    refundNote: "30-day money-back",
    highlightOn: "never",
    scarcity: "first 100 buyers only",
  },
];

function PricingTiersInner() {
  const [emphasis, setEmphasis] = useState<ProEmphasis>("annual");
  const router = useRouter();
  const params = useSearchParams();
  // idle | busy:<plan> | soon | paid
  const [payState, setPayState] = useState<string>("idle");

  const buy = async (plan: PaidPlan) => {
    if (payState.startsWith("busy")) return;
    setPayState(`busy:${plan}`);
    const result = await startCheckout(plan, () => setPayState("paid"));
    if (result.state === "needs-signin") {
      router.push(`/account?next=checkout&plan=${plan}`);
      return;
    }
    if (result.state === "soon") setPayState("soon");
    else if (result.state === "error") setPayState("idle");
    else if (result.state === "opened") setPayState("idle"); // modal owns the flow now
  };

  // Arriving back from sign-in with ?checkout=<plan> — resume automatically.
  useEffect(() => {
    const plan = params.get("checkout");
    if (plan && ["pro-monthly", "pro-annual", "lifetime"].includes(plan)) {
      buy(plan as PaidPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHighlighted = (tier: Tier) =>
    tier.highlightOn === "always" ||
    (tier.highlightOn === "annual" && emphasis === "annual") ||
    (tier.highlightOn === "monthly" && emphasis === "monthly");

  return (
    <section id="pricing-tiers" className="py-16 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <Reveal>
          <div className="text-center mb-10">
            <div className="kicker mb-3">$ cat tiers.conf</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Pricing</h2>
            <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl mx-auto">
              Free for life. Paid when you need more.
            </p>
          </div>
        </Reveal>

        {payState === "paid" && (
          <div className="max-w-xl mx-auto mb-10 glass-card rounded-2xl p-6 text-center border border-[#00E676]/40">
            <div className="font-mono text-[13px] text-[#00E676] mb-1">$ payment received ✓</div>
            <p className="text-sm text-[#C6D3E8]">
              Pro activates within a minute. Check{" "}
              <a href="/account" className="text-[#00E676] underline underline-offset-4">your account</a>{" "}
              — your apps pick it up on next launch or sign-in.
            </p>
          </div>
        )}

        {/* Annual/Monthly toggle */}
        <Reveal delay={80}>
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-[#1C2940] bg-white/[0.03] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setEmphasis("monthly")}
                className={`px-4 py-2 rounded-lg font-mono text-[13px] font-medium transition-all ${
                  emphasis === "monthly"
                    ? "bg-[#00E676] text-black"
                    : "text-[#8FA3BF] hover:text-white"
                }`}
                aria-pressed={emphasis === "monthly"}
              >
                monthly
              </button>
              <button
                type="button"
                onClick={() => setEmphasis("annual")}
                className={`px-4 py-2 rounded-lg font-mono text-[13px] font-medium transition-all flex items-center gap-2 ${
                  emphasis === "annual"
                    ? "bg-[#00E676] text-black"
                    : "text-[#8FA3BF] hover:text-white"
                }`}
                aria-pressed={emphasis === "annual"}
              >
                annual
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    emphasis === "annual"
                      ? "bg-black/15 text-black"
                      : "bg-[#00E676]/15 text-[#00E676]"
                  }`}
                >
                  -31%
                </span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* 4-card grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch">
          {TIERS.map((tier, i) => {
            const highlighted = isHighlighted(tier);
            const isExternal = tier.ctaHref.startsWith("http");

            const card = (
              <Spotlight
                className={`relative flex flex-col h-full p-6 transition-all ${
                  highlighted
                    ? "rounded-[13px] bg-[#081020]"
                    : "panel panel-hover"
                }`}
              >
                <h3 className="font-mono text-[13px] text-[#00E676]">
                  --{tier.key}
                </h3>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`text-5xl font-bold tracking-tight ${highlighted ? "gradient-text" : "text-[#E6EDF7]"}`}>
                    {tier.price}
                  </span>
                  <span className="font-mono text-xs text-[#5C6E8A]">{tier.cadence}</span>
                </div>

                <p className="mt-3 text-sm text-[#8FA3BF] min-h-[40px]">{tier.subhead}</p>

                {tier.scarcity && (
                  <div className="mt-2 inline-flex self-start items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#FFBD2E]/30 bg-[#FFBD2E]/[0.06] font-mono text-[10px] text-[#FFBD2E] uppercase tracking-wider">
                    {tier.scarcity}
                  </div>
                )}

                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-[#C6D3E8]">
                      <Check />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {tier.ctaDataLs ? (
                  <button
                    type="button"
                    onClick={() => buy(tier.ctaDataLs as PaidPlan)}
                    disabled={payState === "soon" || payState.startsWith("busy")}
                    className={`mt-6 text-sm ${
                      payState === "soon"
                        ? "btn-ghost px-5 py-3 font-mono opacity-70 cursor-default"
                        : "btn-primary px-5 py-3"
                    }`}
                  >
                    {payState === "soon"
                      ? "$ payments --launching-soon"
                      : payState === `busy:${tier.ctaDataLs}`
                        ? "opening checkout…"
                        : tier.ctaLabel}
                  </button>
                ) : (
                  <a
                    href={tier.ctaHref}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`mt-6 text-sm ${
                      tier.ctaVariant === "primary"
                        ? "btn-primary px-5 py-3"
                        : "btn-ghost px-5 py-3 font-semibold"
                    }`}
                  >
                    {tier.ctaLabel}
                  </a>
                )}

                {tier.refundNote && (
                  <div className="mt-3 font-mono text-[11px] text-[#5C6E8A] text-center">
                    {tier.refundNote}
                  </div>
                )}
              </Spotlight>
            );

            return (
              <Reveal key={tier.key} delay={i * 90} className="h-full">
                <div id={tier.key} className="relative h-full">
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-[#00E676] text-black font-mono text-[11px] font-semibold whitespace-nowrap shadow-[0_0_20px_rgba(0,230,118,0.5)]">
                      most popular
                    </div>
                  )}
                  {highlighted ? <div className="border-glow h-full">{card}</div> : card}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Suspense } from "react";

export default function PricingTiers() {
  return (
    <Suspense fallback={null}>
      <PricingTiersInner />
    </Suspense>
  );
}
