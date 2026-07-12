import Reveal from "./Reveal";

/* "How it works" as an actual man page — not step cards. */
export default function ManPage() {
  return (
    <section id="how-it-works" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ man sudovoice</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              RTFM. <span className="text-[#5C6E8A]">It&apos;s short.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">
                SUDOVOICE(1) — User Commands
              </span>
              <span className="ml-auto font-mono text-xs text-[#5C6E8A]">v2.6.0</span>
            </div>
            <div className="p-7 md:p-9 font-mono text-[13px] md:text-[14px] leading-7">
              <div className="text-[#00E676] font-semibold">NAME</div>
              <p className="pl-6 text-[#C6D3E8] mb-5">
                sudovoice — offline voice-to-text that types at your cursor
              </p>

              <div className="text-[#00E676] font-semibold">SYNOPSIS</div>
              <p className="pl-6 text-[#C6D3E8] mb-5">
                <span className="text-[#E6EDF7]">sudovoice</span>{" "}
                [<span className="text-[#4FC3F7]">--listen</span>]{" "}
                [<span className="text-[#4FC3F7]">--model</span>{" "}
                <span className="text-[#8FA3BF]">tiny|base|small</span>]{" "}
                [<span className="text-[#4FC3F7]">--cleanup</span>]
              </p>

              <div className="text-[#00E676] font-semibold">DESCRIPTION</div>
              <div className="pl-6 text-[#8FA3BF] mb-5 space-y-2">
                <p>
                  Hold the hotkey and speak.{" "}
                  <span className="text-[#E6EDF7]">whisper.cpp</span> transcribes on
                  your machine while you talk; release the key and an optional LLM
                  pass strips the &ldquo;um okay so basically&rdquo; before the clean
                  sentence is typed into whichever app has focus.
                </p>
                <p>
                  The network stays silent. In offline mode no audio, no text, no
                  telemetry leaves the device — the transcription engine, the models,
                  and your words all live in{" "}
                  <span className="text-[#E6EDF7]">~/.sudovoice</span>.
                </p>
              </div>

              <div className="text-[#00E676] font-semibold">KEYBINDINGS</div>
              <div className="pl-6 text-[#8FA3BF] mb-5 space-y-1">
                <div>
                  <span className="text-[#E6EDF7] inline-block min-w-[170px]">Right Ctrl (hold)</span>
                  push-to-talk on windows
                </div>
                <div>
                  <span className="text-[#E6EDF7] inline-block min-w-[170px]">⌥ Option (hold)</span>
                  push-to-talk on macos
                </div>
                <div>
                  <span className="text-[#E6EDF7] inline-block min-w-[170px]">mic key</span>
                  on the android keyboard (IME)
                </div>
                <div>
                  <span className="text-[#E6EDF7] inline-block min-w-[170px]">&ldquo;scratch that&rdquo;</span>
                  spoken — rewinds the last sentence
                </div>
              </div>

              <div className="text-[#00E676] font-semibold">SEE ALSO</div>
              <p className="pl-6 text-[#8FA3BF]">
                <a href="/docs" className="text-[#4FC3F7] hover:text-[#00E676] transition-colors">docs(7)</a>,{" "}
                <a href="/changelog" className="text-[#4FC3F7] hover:text-[#00E676] transition-colors">changelog(5)</a>,{" "}
                <a href="/pricing" className="text-[#4FC3F7] hover:text-[#00E676] transition-colors">pricing(1)</a>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
