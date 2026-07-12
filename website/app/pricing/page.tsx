import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import PricingTiers from "@/app/components/PricingTiers";
import HashScroll from "@/app/components/HashScroll";

export const metadata: Metadata = {
  title: "Pricing — SudoVoice Voice Typing",
  description:
    "Free voice-to-text for Windows, macOS, Android. Pro from $12/month. Lifetime $249. 30-day money-back. No subscription required for the free tier.",
};

const TIER_IDS = ["free", "pro-monthly", "pro-annual", "lifetime"] as const;

const Check = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#00E676"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Cross = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5C6E8A"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const COMPARISON = [
  {
    tool: "SudoVoice",
    pricing: "$0 free · $99/yr · $249 lifetime",
    hindi: true,
    onDevice: "Win / Mac / Android",
    freeTier: true,
    highlighted: true,
  },
  {
    tool: "Wispr Flow",
    pricing: "$10/month",
    hindi: false,
    onDevice: "—",
    freeTier: false,
    highlighted: false,
  },
  {
    tool: "MacWhisper",
    pricing: "$79.99 one-time",
    hindi: false,
    onDevice: "Mac",
    freeTier: false,
    highlighted: false,
  },
  {
    tool: "macOS Dictation",
    pricing: "Free (built-in)",
    hindi: false,
    onDevice: "Cloud",
    freeTier: true,
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "Is the free tier really free forever?",
    a: "Yes. No credit card needed. The free tier covers 60 minutes/day with the Tiny and Base Whisper models, three LLM cleanups per day, smart punctuation, and auto-type to any app. Use it forever, on one device.",
  },
  {
    q: "Can I switch from monthly to annual?",
    a: "Yes. Email support@sudovoice.com and we'll move you to annual billing. The remaining monthly time is credited toward your annual plan.",
  },
  {
    q: "What happens if I cancel?",
    a: "Pro features lock at the end of your current billing period. The free tier continues working — your settings, models, and history stay on your machine.",
  },
  {
    q: "How does the license key work?",
    a: "After payment, you receive a license key by email. Open SudoVoice, go to Settings → License, paste the key, click Activate. Pro features unlock immediately.",
  },
  {
    q: "How many devices?",
    a: "Pro covers 3 devices. Lifetime covers 5 devices. Devices can be any mix of Windows, Mac, and Android.",
  },
  {
    q: "Refunds?",
    a: "30-day money-back, no questions asked. Email support and the refund processes through Lemon Squeezy within a few business days.",
  },
  {
    q: "Does Lifetime include future Big Updates?",
    a: "Yes. All future updates are included forever — new Whisper model versions, new LLM providers, new platforms (when we ship Linux), all of it.",
  },
  {
    q: "Why USD pricing in India?",
    a: "Most of our buyers are international. Lemon Squeezy handles GST, VAT, and local currency conversion automatically at checkout — you'll see the local equivalent before paying.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <HashScroll ids={TIER_IDS} />

      <main className="pt-20">
        {/* Hero strip */}
        <section className="hero-gradient grid-bg relative px-6 pt-16 pb-8">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="kicker mb-4">$ sudovoice --license</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Free forever. <span className="gradient-text">Pay once if you want more.</span>
            </h1>
            <p className="mt-5 text-lg md:text-xl text-[#8FA3BF] max-w-2xl mx-auto leading-relaxed">
              Free for everyone. Pro for power users. Lifetime for the first 100 buyers
              who want to skip subscriptions for good.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <PricingTiers />

        {/* Why Pro? */}
        <section className="py-20 px-6 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <div className="kicker mb-3">$ diff free pro</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why Pro?</h2>
              <p className="mt-3 text-[#8FA3BF] text-lg max-w-xl mx-auto">
                What you get past the free tier.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="panel panel-hover p-6">
                <div className="font-mono text-[13px] text-[#00E676] mb-3">
                  Better accuracy
                </div>
                <p className="text-[#E2E8F0] text-sm leading-relaxed">
                  Pro unlocks the Large V3 Whisper model (3 GB) for the highest local
                  accuracy, plus Gemini Live cloud routing for streaming transcription
                  and tricky audio. Free tier caps you at Tiny + Base.
                </p>
              </div>
              <div className="panel panel-hover p-6">
                <div className="font-mono text-[13px] text-[#00E676] mb-3">
                  Hindi / Hinglish first
                </div>
                <p className="text-[#E2E8F0] text-sm leading-relaxed">
                  Indian-English bias prompt baked into the cleanup pipeline. Custom
                  vocab adapts to your domain words. Gemini Live handles code-switched
                  Hindi/Hinglish/English without a language picker.
                </p>
              </div>
              <div className="panel panel-hover p-6">
                <div className="font-mono text-[13px] text-[#00E676] mb-3">
                  Save 3+ hours/week
                </div>
                <p className="text-[#E2E8F0] text-sm leading-relaxed">
                  Typing at 40 WPM vs speaking at 130 WPM saves around 3 hours/week.
                  At a $50/hr consultant rate that&apos;s $600/month of value. Pro is
                  2% of that.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing-focused comparison */}
        <section className="py-20 px-6 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="kicker mb-3">$ diff sudovoice --all</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How we compare</h2>
              <p className="mt-3 text-[#8FA3BF] text-lg max-w-xl mx-auto">
                Voice-typing tools side by side.
              </p>
            </div>
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-4 text-xs font-medium uppercase tracking-wider text-[#5C6E8A]">
                      Tool
                    </th>
                    <th className="text-left px-5 py-4 text-xs font-medium uppercase tracking-wider text-[#5C6E8A]">
                      Pricing
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-medium uppercase tracking-wider text-[#5C6E8A]">
                      Hindi / Hinglish
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-medium uppercase tracking-wider text-[#5C6E8A]">
                      On-device
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-medium uppercase tracking-wider text-[#5C6E8A]">
                      Free tier
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.tool}
                      className="border-b border-white/[0.03] last:border-b-0"
                    >
                      <td
                        className={`px-5 py-4 text-sm font-semibold ${
                          row.highlighted ? "text-[#4FC3F7]" : "text-white"
                        }`}
                      >
                        {row.tool}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#8FA3BF]">
                        {row.pricing}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {row.hindi ? <Check /> : <Cross />}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-[#8FA3BF]">
                        {row.onDevice}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {row.freeTier ? <Check /> : <Cross />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-6 relative">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="kicker mb-3">$ man faq</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Questions</h2>
              <p className="mt-3 text-[#8FA3BF] text-lg">Eight common ones.</p>
            </div>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group panel open:border-[#00E676]/40 open:bg-[#00E676]/[0.03] transition-colors"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 text-sm md:text-base font-medium text-white">
                    <span>{item.q}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#5C6E8A] group-open:rotate-180 group-open:text-[#00E676] transition-transform shrink-0 ml-3"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 -mt-1 text-sm text-[#8FA3BF] leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA strip */}
        <section className="py-20 px-6 relative">
          <div className="max-w-3xl mx-auto border-glow">
            <div className="bg-[#081020] p-10 text-center">
              <div className="kicker mb-3">$ sudovoice --start</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Try free, upgrade when ready
              </h2>
              <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl mx-auto">
                Start on the free tier. Pay only if it earns its keep.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href="/#download" className="btn-primary px-7 py-3.5 text-sm">
                  Download — Free in Early Access
                </a>
                <a href="/" className="btn-ghost px-6 py-3.5 text-sm font-semibold">
                  Learn more
                </a>
              </div>
              <div className="mt-4 font-mono text-[11px] text-[#5C6E8A]">30-day money-back</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
