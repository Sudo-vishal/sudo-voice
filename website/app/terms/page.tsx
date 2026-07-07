import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SudoVoice",
  description:
    "SudoVoice terms of service. Lemon Squeezy as Merchant of Record, 30-day money-back, India governing law.",
};

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#070D16] text-white px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-[#6B7A93] mb-4">Last updated: May 10, 2026</p>
        <p className="text-[#9FB0C7] leading-relaxed mb-12">
          The deal between you and SudoVoice. We&apos;ve kept this short and in plain English so you
          can actually read it. By installing the app, the Chrome extension, or signing in to the
          website, you agree to what&apos;s below.
        </p>

        <div className="space-y-10 text-[#9FB0C7] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. The service</h2>
            <p className="mb-3">
              SudoVoice is a voice-to-text product available as:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>A macOS app (signed DMG, distributed from sudovoice.com).</li>
              <li>A Windows app (signed installer).</li>
              <li>A Chrome extension on the Chrome Web Store.</li>
              <li>A web dashboard on sudovoice.com (search, history, settings).</li>
            </ul>
            <p className="mt-3">
              We offer a free tier and a paid Pro tier. The full feature breakdown lives on the{" "}
              <a href="/pricing" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">pricing page</a>{" "}
              and is the source of truth — we don&apos;t restate prices here, because they change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Your account</h2>
            <p className="mb-3">
              The free tier doesn&apos;t require an account. You can install and use it without giving us
              an email.
            </p>
            <p>
              The Pro tier and cloud sync require sign-in via email one-time-password (no password
              for you to remember or for us to leak). You&apos;re responsible for keeping access to that
              email secure. One Pro Lifetime license activates up to 3 machines; one Pro Monthly /
              Annual subscription activates 1 machine at a time and you can switch machines from the
              account dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Payment</h2>
            <p className="mb-3">
              Paid plans are sold through{" "}
              <a
                href="https://www.lemonsqueezy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4FC3F7] hover:text-[#4FC3F7]/80"
              >
                Lemon Squeezy
              </a>
              , who acts as the <strong className="text-white">Merchant of Record</strong> for every
              SudoVoice purchase. That means:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Lemon Squeezy is the seller of record on your invoice / card statement.</li>
              <li>They calculate, collect, and remit GST, VAT, US sales tax, and any other applicable taxes worldwide.</li>
              <li>They handle PCI compliance and store your payment method (we don&apos;t see card numbers).</li>
              <li>Their Terms and Privacy apply to the payment transaction in addition to ours.</li>
            </ul>
            <p className="mt-3">
              Subscriptions renew automatically until you cancel. You can cancel anytime from the
              order receipt or by emailing support — we&apos;ll do it for you.
            </p>
          </section>

          <section id="refund">
            <h2 className="text-xl font-semibold text-white mb-3">4. Refunds</h2>
            <p className="mb-3">
              <strong className="text-white">30-day money-back guarantee</strong> on every paid plan
              — Pro Monthly, Pro Annual, and Pro Lifetime. If SudoVoice isn&apos;t working for you
              within 30 days of purchase, email{" "}
              <a href="mailto:support@sudovoice.com" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">
                support@sudovoice.com
              </a>{" "}
              with the order ID from your Lemon Squeezy receipt. We don&apos;t require a reason. Refunds
              are processed by Lemon Squeezy and typically land back on your card within 5 business
              days.
            </p>
            <p>
              After 30 days, refunds are case-by-case. Subscription renewals can be cancelled at any
              time; cancelling stops the next charge but doesn&apos;t refund the current period (the
              service stays active until the end of the period you paid for).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Your license</h2>
            <p>
              We grant you a non-exclusive, non-transferable, revocable license to use SudoVoice
              on your devices. Pro Lifetime means &quot;the life of the product,&quot; which we commit to
              meaning <strong className="text-white">at least 5 years of major-version updates from
              your purchase date.</strong> If we ever shut the product down, signed-in users get 60
              days&apos; notice and a tool to export every transcript before shutdown.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable use</h2>
            <p className="mb-3">Don&apos;t do any of this:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Resell SudoVoice, repackage it as a hosted service, or strip our branding and rebrand it as your own.</li>
              <li>Reverse-engineer the closed-source binaries (the website and Chrome extension are open source — knock yourself out).</li>
              <li>Run automated bulk transcription that abuses the free tier&apos;s daily limits, or share Pro keys with people outside your household / company.</li>
              <li>Use SudoVoice to transcribe content you don&apos;t have the legal right to record (e.g. recording calls without consent in jurisdictions that require it).</li>
              <li>Attempt to circumvent license checks, modify the app to bypass tier limits, or distribute patched builds.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Termination</h2>
            <p>
              You can stop using SudoVoice any time, and you can request account deletion at any
              time per the{" "}
              <a href="/privacy#5-how-to-delete-your-data" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">
                privacy policy
              </a>
              . We can suspend or terminate accounts that violate the acceptable-use rules, that file
              fraudulent chargebacks, or that we have reasonable grounds to believe are committing
              fraud. Where it&apos;s safe to do so, we&apos;ll tell you why and give you 14 days to fix it
              before the account is closed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. No warranty</h2>
            <p>
              SudoVoice is provided <strong className="text-white">&quot;as is&quot;</strong>. Speech
              recognition is probabilistic — every model on earth makes mistakes, especially on
              accents, code-switching, named entities, and noisy audio. We don&apos;t warrant that
              transcripts will be 100% accurate, that the service will be uninterrupted, or that the
              app will work on every future version of macOS / Windows / Chrome. You agree not to
              rely on transcripts for safety-critical, legal, or medical decisions without human
              review.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Liability cap</h2>
            <p>
              To the maximum extent permitted by law, our total aggregate liability to you for any
              claim arising out of or related to SudoVoice is capped at <strong className="text-white">the
              total fees you have paid us in the 12 months immediately before the event giving rise
              to the claim</strong>. For free-tier users, that cap is &#8377;0 / $0. We&apos;re not liable for
              indirect, consequential, or punitive damages (lost profits, lost data, business
              interruption) — no software vendor in our price range is, and pretending otherwise
              would be dishonest.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Governing law &amp; disputes</h2>
            <p className="mb-3">
              These terms are governed by the laws of <strong className="text-white">India</strong>.
              Any dispute that we can&apos;t resolve over email goes to{" "}
              <strong className="text-white">binding arbitration in Bengaluru, Karnataka</strong>,
              before a single arbitrator under the Arbitration and Conciliation Act 1996. Language
              of arbitration: English. Each side bears its own costs unless the arbitrator decides
              otherwise. Nothing here stops either side from seeking urgent injunctive relief from a
              court.
            </p>
            <p>
              If you&apos;re a consumer in the EU, UK, or any jurisdiction that grants you mandatory
              local-law rights you can&apos;t waive, those rights still apply — the arbitration clause
              doesn&apos;t override them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p>
              Operator: AIwithVishal (Vishal Prasad). India-based.<br />
              Email:{" "}
              <a href="mailto:support@sudovoice.com" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">
                support@sudovoice.com
              </a>
            </p>
            <p className="mt-3">
              When these terms change, we update the &quot;Last updated&quot; date at the top and notify
              signed-in paid users by email at least 14 days before any material change takes effect.
              Your continued use after that period is acceptance of the new version.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-[#6B7A93]">
          <a href="/" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">&larr; Back to SudoVoice</a>
          <span className="mx-3 text-white/10">·</span>
          <a href="/privacy" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">Privacy Policy</a>
        </div>
      </div>
    </main>
  );
}
