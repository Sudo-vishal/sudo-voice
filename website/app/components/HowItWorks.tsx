/* The pipeline, as a terminal would show it. */
export default function HowItWorks() {
  const stages = [
    { name: "mic", detail: "16kHz capture + voice activity detection", color: "#FFBD2E" },
    { name: "whisper", detail: "on-device transcription, 42x realtime", color: "#4FC3F7" },
    { name: "cleanup", detail: "LLM strips fillers, fixes grammar (~100ms)", color: "#4FC3F7" },
    { name: "cursor", detail: "clean text typed into the focused app", color: "#00E676" },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-14">
          <div className="kicker mb-4">$ man sudovoice</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            One hotkey. <span className="text-[#5C6E8A]">One pipeline.</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            No setup wizards, no cloud accounts, no config files.
          </p>
        </div>

        {/* the pipe */}
        <div className="term">
          <div className="term-bar">
            <span className="font-mono text-xs text-[#5C6E8A]">pipeline</span>
          </div>
          <div className="p-6 md:p-8">
            <div className="font-mono text-sm md:text-base flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[#00E676]">$</span>
              {stages.map((s, i) => (
                <span key={s.name} className="flex items-center gap-3">
                  <span
                    className="px-3 py-1.5 rounded border"
                    style={{ color: s.color, borderColor: `${s.color}44`, background: `${s.color}0d` }}
                  >
                    {s.name}
                  </span>
                  {i < stages.length - 1 && <span className="text-[#5C6E8A]">|</span>}
                </span>
              ))}
            </div>
            <div className="mt-6 grid md:grid-cols-4 gap-4">
              {stages.map((s) => (
                <div key={s.name} className="font-mono text-xs leading-5">
                  <span className="text-[#5C6E8A]"># {s.name}:</span>
                  <div className="text-[#8FA3BF] mt-1">{s.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* three steps, numbered like a shell history */}
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            {
              n: "1",
              title: "Hold the hotkey",
              body: (
                <>
                  Hold{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-[#1C2940] font-mono text-xs text-[#8FA3BF]">
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
          ].map((s) => (
            <div key={s.n} className="panel panel-hover p-6">
              <div className="font-mono text-sm text-[#5C6E8A] mb-3">
                <span className="text-[#00E676]">[{s.n}]</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{s.title}</h3>
              <p className="text-[#8FA3BF] text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
