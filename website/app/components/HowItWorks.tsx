import Reveal from "./Reveal";
import Spotlight from "./Spotlight";

/* The pipeline with a light pulse traveling through it. */
export default function HowItWorks() {
  const stages = [
    { name: "mic", detail: "16kHz capture + voice activity detection", color: "#FFBD2E" },
    { name: "whisper", detail: "on-device transcription, 42x realtime", color: "#4FC3F7" },
    { name: "cleanup", detail: "LLM strips fillers, fixes grammar (~100ms)", color: "#4FC3F7" },
    { name: "cursor", detail: "clean text typed into the focused app", color: "#00E676" },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-16">
            <div className="kicker mb-4">$ man sudovoice</div>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              One hotkey.
              <br />
              <span className="text-[#4A5C7C]">One pipeline.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="border-glow">
            <div className="term !border-0">
              <div className="term-bar">
                <span className="font-mono text-xs text-[#5C6E8A]">pipeline — live</span>
                <span className="ml-auto font-mono text-xs text-[#00E676] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-subtle-pulse" />
                  streaming
                </span>
              </div>
              <div className="p-7 md:p-9">
                <div className="font-mono text-sm md:text-base flex flex-wrap items-center gap-x-3 gap-y-3">
                  <span className="text-[#00E676]">$</span>
                  {stages.map((s, i) => (
                    <span key={s.name} className="flex items-center gap-3">
                      <span
                        className="px-3.5 py-2 rounded-lg border transition-all"
                        style={{ color: s.color, borderColor: `${s.color}55`, background: `${s.color}0f`, boxShadow: `0 0 18px -6px ${s.color}66` }}
                      >
                        {s.name}
                      </span>
                      {i < stages.length - 1 && <span className="text-[#3D4E6B]">|</span>}
                    </span>
                  ))}
                </div>

                {/* traveling pulse */}
                <div className="pipe-track mt-7 h-px bg-gradient-to-r from-[#FFBD2E]/30 via-[#4FC3F7]/30 to-[#00E676]/40">
                  <div className="pipe-dot" />
                </div>

                <div className="mt-7 grid md:grid-cols-4 gap-5">
                  {stages.map((s) => (
                    <div key={s.name} className="font-mono text-xs leading-5">
                      <span className="text-[#5C6E8A]"># {s.name}:</span>
                      <div className="text-[#8FA3BF] mt-1">{s.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            {
              n: "1",
              title: "Hold the hotkey",
              body: (
                <>
                  Hold{" "}
                  <kbd className="px-2 py-0.5 rounded-md bg-white/5 border border-[#27395C] font-mono text-xs text-[#E6EDF7] shadow-[0_2px_0_#1C2940]">
                    ⌥ Option
                  </kbd>{" "}
                  from any app. The floating indicator lights up — you&apos;re live.
                </>
              ),
            },
            {
              n: "2",
              title: "Speak naturally",
              body: <>Talk like a human, not a robot. Say &ldquo;comma&rdquo; or &ldquo;scratch that&rdquo; to edit as you go.</>,
            },
            {
              n: "3",
              title: "Release. It's typed.",
              body: (
                <>
                  Cleaned text appears at your cursor.{" "}
                  <span className="font-mono text-[#00E676]">done in 0.3s<span className="animate-blink">_</span></span>
                </>
              ),
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <Spotlight className="panel panel-hover p-7 h-full">
                <div className="font-mono text-sm mb-3">
                  <span className="text-[#00E676]">[{s.n}]</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-[#8FA3BF] text-sm leading-relaxed">{s.body}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
