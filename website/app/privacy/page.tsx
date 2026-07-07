import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SudoVoice",
  description:
    "What SudoVoice stores, where, and how to delete it. On-device by default. Cloud sync only when you sign in.",
};

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#070D16] text-white px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#6B7A93] mb-4">Last updated: May 10, 2026</p>
        <p className="text-[#9FB0C7] leading-relaxed mb-12">
          Plain-language version. We don&apos;t sell your data. We don&apos;t track you across the web.
          Most users never sign in — for them, SudoVoice runs 100% on-device. If you do sign in to
          sync transcripts across devices, we store specific fields in our database and you can ask us
          to delete them at any time. Details below.
        </p>

        <div className="space-y-10 text-[#9FB0C7] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What we collect</h2>
            <p className="mb-4">
              <strong className="text-white">Free / anonymous users (no sign-in).</strong> Nothing
              leaves your device. The Mac app uses WhisperKit on Apple&apos;s on-device CoreML; the
              Windows app uses local Whisper.cpp; the Chrome extension uses your browser&apos;s built-in
              Web Speech API. We don&apos;t see your audio, your transcripts, your usage, or your IP
              address. No account is required to use the free tier.
            </p>
            <p className="mb-4">
              <strong className="text-white">Signed-in users (Pro, or free users who choose to
              sign in for cloud sync).</strong> When you sign in, you opt in to sending your
              transcripts to our database so they can sync across your devices. For each transcript,
              we store the following columns:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">raw_text</code> — the full transcript text</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">cleaned_text</code> — optional LLM-cleaned version (only if you ran cleanup)</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">language</code> — detected BCP-47 code (e.g. <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">hi-IN</code>, <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">en-IN</code>)</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">model_used</code> — which transcription model produced it</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">duration_seconds</code>, <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">word_count</code>, <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">char_count</code> — basic metrics</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">audio_sha256</code> — a hash of the audio (used only for dedupe; we do <em>not</em> store the audio file itself)</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">app_context</code> — which app or website you were dictating into (e.g. <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">{`{"app": "Slack"}`}</code>) so the dashboard can group by source</li>
              <li><code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">metadata</code> — flexible JSON for future fields, currently empty by default</li>
            </ul>
            <p>
              We also store the email address you used to sign in (for authentication), and a
              per-device <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">device_id</code> so you can revoke a specific machine. We do <strong className="text-white">not</strong> store
              the raw audio file. Ever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Where we store it</h2>
            <p>
              Supabase (Postgres 15) in region <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">ap-south-1</code> (Mumbai, India). Picking
              an Indian region is intentional: it keeps latency low for Indian users and keeps
              personal data local under the Digital Personal Data Protection Act 2023. Backups and
              point-in-time recovery snapshots stay in the same region.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Why we store it</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sync your transcripts across the devices you sign in on (Mac, Windows, Chrome, the future Studio web app).</li>
              <li>Search across your dictation history (semantic search is on the roadmap, hence the chunked-embedding table).</li>
              <li>Restore your work if you change machines or lose access to a local copy.</li>
            </ul>
            <p className="mt-4">
              We do <strong className="text-white">not</strong> use your transcripts to train models, sell to advertisers, or
              share with third parties for marketing. Period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Retention</h2>
            <p>
              We keep your transcripts until you delete them. When you delete a transcript, we set a{" "}
              <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">deleted_at</code> timestamp on the row (soft delete) so a misclick can be undone for
              up to 30 days. After 30 days, a scheduled job hard-deletes the row from the database
              and from backups on their next rotation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. How to delete your data</h2>
            <p className="mb-3">
              Right now (May 2026): email <a href="mailto:support@sudovoice.com" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">support@sudovoice.com</a> from your
              account email. We&apos;ll confirm and hard-delete within 5 business days.
            </p>
            <p>
              In Month 2 (target: June 2026): a one-click <strong className="text-white">&quot;Delete my account and all
              data&quot;</strong> button in the in-app account dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Who else has access</h2>
            <p className="mb-3">
              Nobody outside of you. Every table that contains user data has Postgres Row-Level
              Security enabled with the rule <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">auth.uid() = user_id</code>. Even if a bug
              shipped a wrong query, the database itself would refuse to return another user&apos;s rows.
            </p>
            <p>
              We don&apos;t routinely read transcripts. The only situation where a member of our team
              would look at a row is if you write to support and explicitly ask us to investigate
              something specific (e.g. &quot;why didn&apos;t this transcript sync?&quot;). We&apos;ll ask for written
              consent in the support thread before we run that query, and we&apos;ll only inspect the
              specific row you reference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
            <p>
              The Mac app, Windows app, and Chrome extension use no cookies at all. The website at
              sudovoice.com sets a Supabase auth cookie only after you sign in, and only to keep
              you signed in. We do <strong className="text-white">not</strong> use Google Analytics, Facebook
              Pixel, Mixpanel, or any third-party tracking script.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Third parties we share data with</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-white">Lemon Squeezy</strong> — handles payment as our Merchant
                of Record. They see your billing email, country, and the amount paid. They process
                taxes (GST / VAT / sales tax) on our behalf. They never see your transcripts.
              </li>
              <li>
                <strong className="text-white">Resend</strong> — sends one-time login codes to your
                email. They see your email address and the code. They don&apos;t see your transcripts.
              </li>
              <li>
                <strong className="text-white">Supabase</strong> — our database and auth host. They are
                a data processor under our agreement; they don&apos;t access your data for any purpose
                outside running the database.
              </li>
              <li>
                <strong className="text-white">Vercel</strong> — hosts the sudovoice.com website and
                API. They see request metadata (URL, status code, timing) but not your transcript
                content.
              </li>
            </ul>
            <p className="mt-3">
              That&apos;s the complete list. No ad networks, no analytics SaaS, no data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Your rights</h2>
            <p className="mb-3">
              Under the DPDP Act 2023 (India) and GDPR (EU), you can ask us to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-white">Access</strong> — give you a copy of everything we store about you.</li>
              <li><strong className="text-white">Correct</strong> — fix anything wrong (e.g. a typo in your email).</li>
              <li><strong className="text-white">Delete</strong> — wipe your account and every row tied to your <code className="text-[#E2E8F0] bg-white/5 px-1.5 py-0.5 rounded">user_id</code>.</li>
              <li><strong className="text-white">Port</strong> — export your transcripts in JSON or CSV.</li>
              <li><strong className="text-white">Withdraw consent</strong> — stop the cloud sync at any time. (Your local app keeps working.)</li>
            </ul>
            <p className="mt-3">
              Email <a href="mailto:support@sudovoice.com" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">support@sudovoice.com</a> with the request. Response
              within 5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Source code</h2>
            <p>
              The website and Chrome extension are open source. You can audit how we collect data at{" "}
              <a
                href="https://github.com/Sudo-vishal/sudovoice"
                className="text-[#4FC3F7] hover:text-[#4FC3F7]/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/Sudo-vishal/sudovoice
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p>
              Operator: AIwithVishal (Vishal Prasad). India-based.<br />
              Email: <a href="mailto:support@sudovoice.com" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">support@sudovoice.com</a>
            </p>
            <p className="mt-3">
              When this policy changes, we update the &quot;Last updated&quot; date at the top and notify
              signed-in users by email at least 14 days before any material change takes effect.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-[#6B7A93]">
          <a href="/" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">&larr; Back to SudoVoice</a>
          <span className="mx-3 text-white/10">·</span>
          <a href="/terms" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">Terms of Service</a>
        </div>
      </div>
    </main>
  );
}
