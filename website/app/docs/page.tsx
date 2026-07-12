import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { DOWNLOADS } from "@/app/lib/downloads";

export const metadata: Metadata = {
  title: "Docs — SudoVoice",
  description:
    "Getting started on Windows, macOS, and Android. Hotkeys, Whisper model guide, optional AI cleanup, and privacy.",
};

const TOC: [string, string][] = [
  ["#getting-started", "getting started"],
  ["#hotkeys", "hotkeys"],
  ["#models", "choosing a whisper model"],
  ["#ai-cleanup", "optional ai cleanup"],
  ["#privacy", "privacy"],
  ["#faq", "faq"],
];

function SectionHeader({ cmd, title }: { cmd: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="kicker mb-3">{cmd}</div>
      <h2 className="text-2xl md:text-4xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 font-mono text-[13px] text-[#8FA3BF] leading-relaxed">
      <span className="text-[#00E676] shrink-0">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-24 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* header */}
          <div className="mb-12">
            <div className="kicker mb-4">$ man sudovoice</div>
            <h1 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Docs
            </h1>
            <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
              From download to dictating in five minutes — on Windows, macOS,
              and Android.
            </p>
          </div>

          {/* toc */}
          <nav className="panel p-5 mb-16 font-mono text-[13px]" aria-label="Table of contents">
            <div className="text-[#5C6E8A] mb-3">// contents</div>
            <ul className="space-y-2">
              {TOC.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-[#8FA3BF] hover:text-[#00E676] transition-colors">
                    <span className="text-[#00E676] mr-2">&gt;</span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---- getting started ---- */}
          <section id="getting-started" className="mb-20 scroll-mt-24">
            <SectionHeader cmd="$ sudovoice --init" title="Getting started" />

            <div className="space-y-6">
              {/* Windows */}
              <div className="term">
                <div className="term-bar">
                  <span className="font-mono text-xs text-[#5C6E8A]">windows — 10 / 11 x64</span>
                  <a href={DOWNLOADS.windows.href} className="ml-auto font-mono text-xs text-[#00E676] hover:underline">
                    get SudoVoice-Setup.exe ↓
                  </a>
                </div>
                <div className="p-6">
                  <ol className="space-y-2.5">
                    <Step n={1}>
                      Run <span className="text-white">SudoVoice-Setup.exe</span>. SmartScreen may show
                      &ldquo;Windows protected your PC&rdquo; — v1 is unsigned, so click{" "}
                      <span className="text-white">More info → Run anyway</span>.
                    </Step>
                    <Step n={2}>
                      First launch downloads the Whisper model (~140 MB). One-time; everything runs
                      offline after that.
                    </Step>
                    <Step n={3}>
                      SudoVoice lives in the <span className="text-white">system tray</span>. Hold{" "}
                      <span className="text-white">Right Ctrl</span> anywhere, speak, release — clean
                      text is typed at your cursor in any app.
                    </Step>
                  </ol>
                </div>
              </div>

              {/* macOS */}
              <div className="term">
                <div className="term-bar">
                  <span className="font-mono text-xs text-[#5C6E8A]">macos — 14 sonoma+</span>
                  <a href={DOWNLOADS.macos.href} className="ml-auto font-mono text-xs text-[#00E676] hover:underline">
                    get SudoVoice.dmg ↓
                  </a>
                </div>
                <div className="p-6">
                  <ol className="space-y-2.5">
                    <Step n={1}>
                      Open the DMG and drag <span className="text-white">SudoVoice</span> to{" "}
                      <span className="text-white">Applications</span>.
                    </Step>
                    <Step n={2}>
                      First time: <span className="text-white">right-click → Open</span> (the app is
                      unsigned, so a normal double-click gets blocked once).
                    </Step>
                    <Step n={3}>
                      Grant <span className="text-white">Microphone</span> and{" "}
                      <span className="text-white">Accessibility</span> permissions when prompted —
                      mic to hear you, accessibility to type at your cursor.
                    </Step>
                  </ol>
                </div>
              </div>

              {/* Android */}
              <div className="term">
                <div className="term-bar">
                  <span className="font-mono text-xs text-[#5C6E8A]">android — 8.0+</span>
                  <a href={DOWNLOADS.android.href} className="ml-auto font-mono text-xs text-[#00E676] hover:underline">
                    get SudoVoice.apk ↓
                  </a>
                </div>
                <div className="p-6">
                  <ol className="space-y-2.5">
                    <Step n={1}>
                      Download the APK and open it. Allow{" "}
                      <span className="text-white">Install from this source</span> when Android asks
                      (sideload — no Play Store needed).
                    </Step>
                    <Step n={2}>
                      Enable the keyboard: <span className="text-white">Settings → System → Keyboard →
                      On-screen keyboards → SudoVoice</span>.
                    </Step>
                    <Step n={3}>
                      In any text field, switch to the SudoVoice keyboard (IME), tap the mic, and speak.
                    </Step>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* ---- hotkeys ---- */}
          <section id="hotkeys" className="mb-20 scroll-mt-24">
            <SectionHeader cmd="$ sudovoice --keys" title="Hotkeys" />
            <div className="term overflow-x-auto">
              <div className="term-bar">
                <span className="font-mono text-xs text-[#5C6E8A]">hotkeys.tsv</span>
              </div>
              <table className="w-full min-w-[520px] font-mono text-[13px]">
                <thead>
                  <tr className="border-b border-[#1C2940]">
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">platform</th>
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">key</th>
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">behavior</th>
                  </tr>
                </thead>
                <tbody className="text-[#8FA3BF]">
                  <tr className="border-b border-[#101A2E]">
                    <td className="px-6 py-3.5">windows</td>
                    <td className="px-6 py-3.5 text-[#00E676]">hold Right Ctrl</td>
                    <td className="px-6 py-3.5">push-to-talk — release to type</td>
                  </tr>
                  <tr className="border-b border-[#101A2E]">
                    <td className="px-6 py-3.5">macos</td>
                    <td className="px-6 py-3.5 text-[#00E676]">hold ⌥ Option</td>
                    <td className="px-6 py-3.5">push-to-talk — release to type</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5">android</td>
                    <td className="px-6 py-3.5 text-[#00E676]">mic key on keyboard</td>
                    <td className="px-6 py-3.5">tap to talk, tap to stop</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-[12px] text-[#5C6E8A]">
              # the hotkey is global — it works in any app, any text field.
            </p>
          </section>

          {/* ---- models ---- */}
          <section id="models" className="mb-20 scroll-mt-24">
            <SectionHeader cmd="$ sudovoice --model" title="Choosing a Whisper model" />
            <p className="text-[#8FA3BF] mb-6 max-w-2xl">
              Whisper runs entirely on your machine. Bigger models hear better but
              take more RAM and time. Downloads happen once; after that the network
              stays silent.
            </p>
            <div className="term overflow-x-auto">
              <div className="term-bar">
                <span className="font-mono text-xs text-[#5C6E8A]">models.tsv</span>
              </div>
              <table className="w-full min-w-[560px] font-mono text-[13px]">
                <thead>
                  <tr className="border-b border-[#1C2940]">
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">model</th>
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">size</th>
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">speed</th>
                    <th className="text-left px-6 py-3.5 text-[#5C6E8A] font-normal">pick it when</th>
                  </tr>
                </thead>
                <tbody className="text-[#8FA3BF]">
                  <tr className="border-b border-[#101A2E]">
                    <td className="px-6 py-3.5 text-white">tiny</td>
                    <td className="px-6 py-3.5">75 MB</td>
                    <td className="px-6 py-3.5">fastest</td>
                    <td className="px-6 py-3.5">older machines, quick notes, short phrases</td>
                  </tr>
                  <tr className="border-b border-[#101A2E] bg-[#00E676]/[0.04] shadow-[inset_2px_0_0_#00E676]">
                    <td className="px-6 py-3.5 text-white">base <span className="text-[#00E676] text-[11px]">← default</span></td>
                    <td className="px-6 py-3.5">140 MB</td>
                    <td className="px-6 py-3.5">fast</td>
                    <td className="px-6 py-3.5">daily dictation — the accuracy/speed sweet spot</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 text-white">small</td>
                    <td className="px-6 py-3.5">460 MB</td>
                    <td className="px-6 py-3.5">medium</td>
                    <td className="px-6 py-3.5">accents, jargon, long-form professional work</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-[12px] text-[#5C6E8A]">
              # switch anytime in settings — the app downloads the new model and keeps working offline.
            </p>
          </section>

          {/* ---- ai cleanup ---- */}
          <section id="ai-cleanup" className="mb-20 scroll-mt-24">
            <SectionHeader cmd="$ sudovoice --cleanup" title="Optional AI cleanup" />
            <div className="panel p-6">
              <p className="text-[#8FA3BF] leading-relaxed mb-4">
                Raw transcription is faithful — including every &ldquo;um okay so
                basically&rdquo;. The optional cleanup pass sends the{" "}
                <span className="text-white">text</span> (never audio) to an LLM that
                strips fillers and fixes grammar before it lands at your cursor.
              </p>
              <ol className="space-y-2.5 mb-4">
                <Step n={1}>
                  Get a free Gemini API key from{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00E676] hover:underline"
                  >
                    Google AI Studio
                  </a>{" "}
                  — bring your own key, we never proxy it.
                </Step>
                <Step n={2}>
                  Paste it in <span className="text-white">Settings → AI cleanup</span> and toggle it on.
                </Step>
                <Step n={3}>
                  Leave it off and SudoVoice stays 100% offline — cleanup is strictly opt-in.
                </Step>
              </ol>
              <div className="font-mono text-[12px] text-[#5C6E8A]">
                # your key is stored locally on your device, used only for your own requests.
              </div>
            </div>
          </section>

          {/* ---- privacy ---- */}
          <section id="privacy" className="mb-20 scroll-mt-24">
            <SectionHeader cmd="$ sudovoice --privacy" title="Privacy" />
            <div className="term">
              <div className="term-bar">
                <span className="font-mono text-xs text-[#5C6E8A]">network monitor</span>
                <span className="ml-auto font-mono text-xs text-[#00E676]">▉ 0 B/s upstream</span>
              </div>
              <div className="p-6 font-mono text-[13px] text-[#8FA3BF] space-y-2.5 leading-relaxed">
                <div><span className="text-[#00E676]">[x]</span> in offline mode, audio <span className="text-white">never leaves your device</span> — transcription is local whisper.cpp</div>
                <div><span className="text-[#00E676]">[x]</span> the only network call the core app makes is the one-time model download</div>
                <div><span className="text-[#00E676]">[x]</span> optional AI cleanup sends transcribed <span className="text-white">text</span> to the provider you configured — never audio, and only if you turned it on</div>
                <div><span className="text-[#00E676]">[x]</span> AGPL-3.0 source on <a href="https://github.com/Sudo-vishal/SudoVoice" target="_blank" rel="noopener noreferrer" className="text-[#00E676] hover:underline">GitHub</a> — audit the audio path yourself</div>
              </div>
            </div>
            <p className="mt-4 font-mono text-[12px] text-[#5C6E8A]">
              # full policy at <a href="/privacy" className="text-[#8FA3BF] hover:text-[#00E676] underline underline-offset-4 decoration-[#1C2940]">/privacy</a>
            </p>
          </section>

          {/* ---- faq ---- */}
          <section id="faq" className="scroll-mt-24">
            <SectionHeader cmd="$ man faq" title="FAQ" />
            <div className="space-y-3">
              {[
                {
                  q: "Why does Windows warn me about the installer?",
                  a: "SmartScreen flags any unsigned installer without established reputation — v1 isn't code-signed yet. Click More info → Run anyway. The .exe is built by CI and served straight from GitHub Releases.",
                },
                {
                  q: "Does it work without internet?",
                  a: "Yes. After the one-time model download, transcription runs fully offline via whisper.cpp. Only the optional AI cleanup needs a connection, and only when enabled.",
                },
                {
                  q: "Which apps does it type into?",
                  a: "Any app with a text cursor — editors, terminals, browsers, chat apps. On Windows and macOS it types at the system cursor; on Android it's a keyboard (IME), so it works in every app that shows a keyboard.",
                },
                {
                  q: "How do I change the hotkey?",
                  a: "Settings → Hotkey. Defaults are Right Ctrl (Windows) and Option (macOS), chosen because nothing else uses them as a lone hold.",
                },
                {
                  q: "The model download failed — what now?",
                  a: "Check your connection and relaunch; the download resumes. Behind a proxy, models can also be dropped into the app's model folder manually (see the GitHub README).",
                },
                {
                  q: "Where do I report bugs?",
                  a: "GitHub issues — include the log line and your OS. Fixes ship fast.",
                },
              ].map((item) => (
                <details key={item.q} className="group panel open:border-[#00E676]/40 open:bg-[#00E676]/[0.02] transition-colors">
                  <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 text-sm md:text-base font-medium text-white">
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[13px] text-[#00E676]">?</span>
                      {item.q}
                    </span>
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
                  <div className="px-5 pb-4 pl-[46px] -mt-1 text-sm text-[#8FA3BF] leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
