import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Welcome to Pro — SudoVoice",
  description:
    "Thanks for upgrading. Check your email for the license key, then activate it in SudoVoice Settings → License.",
  robots: { index: false, follow: false },
};

const PRO_RECAP = [
  "Unlimited transcription",
  "All 5 Whisper models (Tiny → Large V3)",
  "All 7 LLM providers",
  "Gemini Live streaming transcription",
  "Batch file transcription",
  "Custom voice commands",
  "3 devices (5 with Lifetime)",
];

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

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_email?: string; order_id?: string }>;
}) {
  const params = await searchParams;
  const rawEmail = typeof params.customer_email === "string" ? params.customer_email : "";
  // Cheap sanity check — render only if it looks email-shaped, otherwise show generic copy.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
  const email = looksLikeEmail ? rawEmail : "";

  return (
    <>
      <Navbar />

      <main className="pt-20">
        {/* Hero */}
        <section className="hero-gradient relative px-6 pt-20 pb-12">
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4FC3F7]/15 border border-[#4FC3F7]/40 mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4FC3F7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Welcome to <span className="gradient-text">Pro</span>
            </h1>
            <p className="mt-5 text-lg text-[#9FB0C7] max-w-xl mx-auto leading-relaxed">
              Thanks for upgrading. Your license key is on its way.
            </p>
          </div>
        </section>

        {/* Email check */}
        <section className="px-6 pb-8">
          <div className="max-w-2xl mx-auto rounded-2xl border border-[#4FC3F7]/30 bg-[#4FC3F7]/[0.04] p-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-[#4FC3F7] mb-2">
              Step 1 — Check your email
            </div>
            {email ? (
              <p className="text-[#E2E8F0] text-base">
                Look for the license key in your inbox at{" "}
                <span className="text-white font-mono break-all">{email}</span>. The
                email comes from <span className="text-white">Lemon Squeezy</span> with
                the subject line <span className="text-white">&ldquo;Your SudoVoice license key&rdquo;</span>.
              </p>
            ) : (
              <p className="text-[#E2E8F0] text-base">
                Look for the license key in the email address you used at checkout. The
                email comes from <span className="text-white">Lemon Squeezy</span> with
                the subject line <span className="text-white">&ldquo;Your SudoVoice license key&rdquo;</span>.
              </p>
            )}
            <p className="mt-3 text-sm text-[#6B7A93]">
              Delivery usually takes under a minute.
            </p>
          </div>
        </section>

        {/* Activation steps */}
        <section className="px-6 py-8">
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-[#4FC3F7] mb-4">
              Then in SudoVoice
            </div>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#4FC3F7] text-black text-sm font-semibold flex items-center justify-center">
                  1
                </div>
                <div className="text-[#E2E8F0] text-base">
                  Open <span className="text-white font-medium">Settings</span> from the
                  menu bar icon — or press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-xs font-mono text-white">
                    ⌘ ,
                  </kbd>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#4FC3F7] text-black text-sm font-semibold flex items-center justify-center">
                  2
                </div>
                <div className="text-[#E2E8F0] text-base">
                  Click the <span className="text-white font-medium">License</span> tab
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#4FC3F7] text-black text-sm font-semibold flex items-center justify-center">
                  3
                </div>
                <div className="text-[#E2E8F0] text-base">
                  Paste your key, click <span className="text-white font-medium">Activate</span>.
                  Pro features unlock immediately.
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Don't see the email */}
        <section className="px-6 py-8">
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-[#9FB0C7] mb-3">
              Don&apos;t see the email?
            </div>
            <ul className="space-y-2 text-sm text-[#9FB0C7]">
              <li className="flex items-start gap-2">
                <Check />
                <span>Check the spam / junk / promotions folders</span>
              </li>
              <li className="flex items-start gap-2">
                <Check />
                <span>
                  Search for <span className="text-white font-mono">lemonsqueezy</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check />
                <span>
                  Wait 5 minutes — sometimes the receipt arrives before the license email
                </span>
              </li>
            </ul>
            <a
              href="mailto:support@sudovoice.com?subject=License%20key%20not%20received"
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all"
            >
              Email support@sudovoice.com
            </a>
          </div>
        </section>

        {/* Recap */}
        <section className="px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">What you just unlocked</h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <ul className="space-y-2.5">
                {PRO_RECAP.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[#E2E8F0]">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-xs text-[#6B7A93] text-center">
              30-day money-back. Email support@sudovoice.com to refund anytime in the
              first 30 days, no questions asked.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
