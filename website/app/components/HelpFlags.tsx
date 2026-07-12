import Reveal from "./Reveal";

/* Features as `--help` flag output — one line per capability, no card grid. */
const FLAGS: { flag: string; desc: React.ReactNode }[] = [
  {
    flag: "--offline",
    desc: (
      <>
        whisper.cpp runs on <span className="text-[#E6EDF7]">your</span> machine ·
        0 cloud calls · nothing to subpoena
      </>
    ),
  },
  {
    flag: "--cleanup",
    desc: <>optional LLM pass strips the filler in ~100ms — &ldquo;like you know the the&rdquo; never lands</>,
  },
  {
    flag: "--hotkey",
    desc: (
      <>
        hold <span className="text-[#E6EDF7]">Right Ctrl</span> (win) /{" "}
        <span className="text-[#E6EDF7]">⌥</span> (mac) anywhere · release to type at
        your cursor
      </>
    ),
  },
  {
    flag: "--ime",
    desc: <>on android it&apos;s a keyboard — dictate into any app on your phone</>,
  },
  {
    flag: "--hindi",
    desc: <>hindi + hinglish in, clean english out · tuned for accents others ignore</>,
  },
  {
    flag: "--commands",
    desc: <>&ldquo;scratch that&rdquo; undoes · &ldquo;comma&rdquo; punctuates · hands never leave the mic</>,
  },
  {
    flag: "--open-source",
    desc: (
      <>
        AGPL-3.0 · the apps, the site, the audio path —{" "}
        <a
          href="https://github.com/Sudo-vishal/SudoVoice"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4FC3F7] hover:text-[#00E676] transition-colors"
        >
          audit it yourself
        </a>
      </>
    ),
  },
];

export default function HelpFlags() {
  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ sudovoice --help</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Flags, <span className="text-[#5C6E8A]">not features.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">usage: sudovoice [flags]</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-[13px] md:text-[14px]">
              <div className="text-[#5C6E8A] mb-4">
                sudovoice — dictation with a config file, not a settings maze
              </div>
              <div className="space-y-0.5">
                {FLAGS.map((f) => (
                  <div
                    key={f.flag}
                    className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-0.5 rounded px-3 py-2 -mx-3 hover:bg-[#00E676]/[0.04] transition-colors"
                  >
                    <span className="text-[#00E676]">{f.flag}</span>
                    <span className="text-[#8FA3BF] leading-relaxed">{f.desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-[#3D4E6B]">
                # every flag ships in the free tier. no trial clock.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
