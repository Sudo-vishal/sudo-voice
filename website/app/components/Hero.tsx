"use client";

import { useEffect, useState } from "react";

const RAW = "um okay so basically we should uh ship this to production right";
const CLEAN = "We should ship this to production, right?";

/* Looping session: type command → status → raw speech → cleaned → done → restart */
export default function Hero() {
  const [cmd, setCmd] = useState("");
  const [stage, setStage] = useState(0);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const CMD = "sudovoice --listen";

    if (stage === 0) {
      if (cmd.length < CMD.length) {
        t = setTimeout(() => setCmd(CMD.slice(0, cmd.length + 1)), 55);
      } else {
        t = setTimeout(() => setStage(1), 350);
      }
    } else if (stage === 1) {
      t = setTimeout(() => setStage(2), 500);
    } else if (stage === 2) {
      if (raw.length < RAW.length) {
        t = setTimeout(() => setRaw(RAW.slice(0, raw.length + 2)), 40);
      } else {
        t = setTimeout(() => setStage(3), 400);
      }
    } else if (stage === 3) {
      t = setTimeout(() => setStage(4), 500);
    } else {
      t = setTimeout(() => {
        setCmd("");
        setRaw("");
        setStage(0);
      }, 4500);
    }
    return () => clearTimeout(t);
  }, [cmd, raw, stage]);

  return (
    <section className="hero-gradient noise relative min-h-screen flex items-center px-6 pt-28 pb-12 overflow-hidden">
      <div className="aurora" />
      <div className="absolute inset-0 grid-bg" />

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
        {/* ---- left: copy ---- */}
        <div>
          <div className="animate-fade-in-up inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#00E676]/25 bg-[#00E676]/[0.06] backdrop-blur-sm mb-7">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]" />
            </span>
            <span className="font-mono text-[12.5px] text-[#7CFFC4]">v2.6.0 — words appear while you speak</span>
          </div>

          <h1 className="animate-fade-in-up animation-delay-200 headline-glow text-[3.4rem] md:text-[4.6rem] font-bold tracking-[-0.03em] leading-[1.02]">
            Your voice,
            <br />
            with <span className="text-shine">root access</span>.
          </h1>

          <p className="animate-fade-in-up animation-delay-400 mt-7 text-lg md:text-xl text-[#8FA3BF] max-w-xl leading-relaxed">
            Hold a key. Speak. Whisper transcribes on your machine, an LLM strips
            the &ldquo;um okay so basically&rdquo;, and clean text lands at your cursor —
            in any app. <span className="text-[#E6EDF7] font-medium">Audio never leaves your device.</span>
          </p>

          <div className="animate-fade-in-up animation-delay-600 mt-10 flex flex-wrap items-center gap-4">
            <a href="#download" className="btn-primary px-8 py-4 text-base">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" />
              </svg>
              Download free
            </a>
            <a
              href="https://github.com/Sudo-vishal/SudoVoice"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost px-7 py-4 text-base font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Star on GitHub
            </a>
          </div>

          <div className="animate-fade-in-up animation-delay-600 mt-6 font-mono text-[13px] text-[#5C6E8A]">
            mac · windows · chrome&nbsp;&nbsp;·&nbsp;&nbsp;<span className="text-[#7CFFC4]">$0 forever</span>&nbsp;&nbsp;·&nbsp;&nbsp;open source
          </div>
        </div>

        {/* ---- right: floating terminal with bloom ---- */}
        <div className="animate-fade-in-up animation-delay-400 tilt-stage relative">
          <div className="bloom" />

          {/* floating chips */}
          <div className="chip-float absolute -top-7 -left-3 z-20 panel px-3.5 py-2 font-mono text-xs text-[#7CFFC4] shadow-xl shadow-black/40">
            ⌥ hold-to-talk
          </div>
          <div className="chip-float chip-float-2 absolute -bottom-6 left-10 z-20 panel px-3.5 py-2 font-mono text-xs text-[#4FC3F7] shadow-xl shadow-black/40">
            0 cloud calls
          </div>
          <div className="chip-float chip-float-3 absolute -top-5 right-4 z-20 panel px-3.5 py-2 font-mono text-xs text-[#FFBD2E] shadow-xl shadow-black/40">
            ~100ms cleanup
          </div>

          <div className="tilt-card border-glow shadow-2xl shadow-black/60">
            <div className="term !border-0">
              <div className="term-bar">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="ml-2 font-mono text-xs text-[#5C6E8A]">sudovoice — zsh</span>
                <span className="ml-auto flex items-center gap-2 font-mono text-xs text-[#00E676]">
                  {stage === 2 ? (
                    <span className="flex items-end gap-[3px] h-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="wave-bar w-[3px] bg-[#00E676]" style={{ height: 6 }} />
                      ))}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-subtle-pulse" />
                  )}
                  mic
                </span>
              </div>
              <div className="p-6 font-mono text-[13px] leading-7 min-h-[300px] scanlines">
                <div>
                  <span className="text-[#00E676]">$</span>{" "}
                  <span className="text-[#E6EDF7]">{cmd}</span>
                  {stage === 0 && <span className="inline-block w-2 h-4 bg-[#00E676] align-middle animate-blink ml-0.5" />}
                </div>

                {stage >= 1 && (
                  <div className="text-[#5C6E8A]">
                    <span className="text-[#00E676]">●</span> listening&nbsp;&nbsp;
                    model=<span className="text-[#4FC3F7]">whisper-base</span>&nbsp;&nbsp;
                    cloud=<span className="text-[#4FC3F7]">off</span>
                  </div>
                )}

                {stage >= 2 && (
                  <div className="mt-2.5 text-[#5C6E8A]">
                    <span className="text-[#FFBD2E]">mic&gt;</span>{" "}
                    <span className="italic">&ldquo;{raw}
                    {stage === 2 && <span className="inline-block w-2 h-4 bg-[#5C6E8A] align-middle animate-blink ml-0.5" />}
                    &rdquo;</span>
                  </div>
                )}

                {stage >= 3 && (
                  <div className="mt-2.5">
                    <span className="text-[#00E676]">✓ cleaned</span>{" "}
                    <span className="text-[#5C6E8A]">→</span>{" "}
                    <span className="text-[#E6EDF7] bg-[#00E676]/10 px-1.5 py-0.5 rounded">&ldquo;{CLEAN}&rdquo;</span>
                  </div>
                )}

                {stage >= 4 && (
                  <>
                    <div className="mt-1 text-[#5C6E8A]">
                      ✓ typed at cursor · <span className="text-[#4FC3F7]">0.3s</span>
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[#00E676]">$</span>{" "}
                      <span className="inline-block w-2 h-4 bg-[#00E676] align-middle animate-blink" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* reflection */}
          <div className="mx-10 h-16 mt-1 rounded-[50%] bg-[#00E676]/10 blur-2xl" />
        </div>
      </div>

      {/* scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] text-[#3D4E6B] flex flex-col items-center gap-1.5">
        <span>scroll</span>
        <span className="animate-blink">▼</span>
      </div>
    </section>
  );
}
