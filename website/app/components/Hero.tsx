"use client";

import { useEffect, useState } from "react";
import OSDownload from "./OSDownload";

const RAW = "um okay so basically we should uh ship this to production right";
const CLEAN = "We should ship this to production, right?";
const CMD = "sudovoice --listen";

/* Terminal-as-hero: one full-width session window. The headline and CTA sit
   beside the prompt; the session loops type → listen → raw speech → cleaned
   → typed. Stats and platform targets are lines of terminal output, not
   marketing chrome. */
export default function Hero() {
  const [cmd, setCmd] = useState("");
  const [stage, setStage] = useState(0);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

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
      }, 5000);
    }
    return () => clearTimeout(t);
  }, [cmd, raw, stage]);

  return (
    <section className="hero-gradient noise relative px-6 pt-32 pb-20 overflow-hidden">
      <div className="aurora" />
      <div className="absolute inset-0 grid-bg" />

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* headline row: copy left, install column right */}
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-16 items-end mb-10">
          <div>
            <h1 className="headline-glow text-[3rem] md:text-[4.2rem] font-bold tracking-[-0.03em] leading-[1.02]">
              Your voice, with{" "}
              <span className="text-shine">root access</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#8FA3BF] max-w-2xl leading-relaxed">
              Offline voice-to-text for people who live in a shell. Hold a key,
              speak, and whisper.cpp + an optional LLM pass type the cleaned-up
              sentence at your cursor —{" "}
              <span className="text-[#E6EDF7] font-medium">
                audio never leaves your machine.
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-4">
            <OSDownload />
            <a
              href="https://github.com/Sudo-vishal/SudoVoice"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] text-[#8FA3BF] hover:text-[#00E676] transition-colors"
            >
              <span className="text-[#00E676]">$</span> git clone — AGPL-3.0, star it ↗
            </a>
          </div>
        </div>

        {/* the terminal IS the hero */}
        <div className="border-glow shadow-2xl shadow-black/60">
          <div className="term !border-0">
            <div className="term-bar">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-2 font-mono text-xs text-[#5C6E8A]">
                sudovoice@local — zsh — 132×24
              </span>
              <span className="ml-auto flex items-center gap-2 font-mono text-xs text-[#00E676]">
                {stage === 2 ? (
                  <span className="flex items-end gap-[3px] h-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="wave-bar w-[3px] bg-[#00E676]"
                        style={{ height: 6 }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-subtle-pulse" />
                )}
                mic
              </span>
            </div>

            <div className="p-6 md:p-8 font-mono text-[13px] md:text-[14px] leading-7 min-h-[330px] scanlines grid md:grid-cols-[1.5fr_1fr] gap-8">
              {/* live session (animated) */}
              <div>
                <div>
                  <span className="text-[#00E676]">$</span>{" "}
                  <span className="text-[#E6EDF7]">{cmd}</span>
                  {stage === 0 && (
                    <span className="inline-block w-2 h-4 bg-[#00E676] align-middle animate-blink ml-0.5" />
                  )}
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
                    <span className="italic">
                      &ldquo;{raw}
                      {stage === 2 && (
                        <span className="inline-block w-2 h-4 bg-[#5C6E8A] align-middle animate-blink ml-0.5" />
                      )}
                      &rdquo;
                    </span>
                  </div>
                )}

                {stage >= 3 && (
                  <div className="mt-2.5">
                    <span className="text-[#00E676]">✓ cleaned</span>{" "}
                    <span className="text-[#5C6E8A]">→</span>{" "}
                    <span className="text-[#E6EDF7] bg-[#00E676]/10 px-1.5 py-0.5 rounded">
                      &ldquo;{CLEAN}&rdquo;
                    </span>
                  </div>
                )}

                {stage >= 4 && (
                  <>
                    <div className="mt-1 text-[#5C6E8A]">
                      ✓ typed at cursor ·{" "}
                      <span className="text-[#4FC3F7]">0.3s</span>
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[#00E676]">$</span>{" "}
                      <span className="inline-block w-2 h-4 bg-[#00E676] align-middle animate-blink" />
                    </div>
                  </>
                )}
              </div>

              {/* status pane: stats as output, always visible */}
              <div className="border-t md:border-t-0 md:border-l border-[#1C2940] pt-5 md:pt-0 md:pl-8 text-[#5C6E8A] space-y-1.5">
                <div className="text-[#3D4E6B]"># sudovoice --status</div>
                <div>
                  engine&nbsp;&nbsp;&nbsp;<span className="text-[#4FC3F7]">whisper.cpp</span>{" "}
                  <span className="text-[#00E676]">42x realtime</span>
                </div>
                <div>
                  upstream&nbsp;<span className="text-[#00E676]">0 B/s</span> — audio stays local
                </div>
                <div>
                  cleanup&nbsp;&nbsp;<span className="text-[#4FC3F7]">~100ms</span> llm pass (optional)
                </div>
                <div>
                  targets&nbsp;&nbsp;<span className="text-[#E6EDF7]">windows · macos · android</span>
                </div>
                <div>
                  license&nbsp;&nbsp;<span className="text-[#E6EDF7]">AGPL-3.0</span> ·{" "}
                  <span className="text-[#7CFFC4]">$0 forever</span>
                </div>
                <div className="pt-3 text-[#3D4E6B]">
                  # hold <span className="text-[#8FA3BF]">RCtrl</span> (win) / <span className="text-[#8FA3BF]">⌥</span> (mac)
                  <br /># release to type. that&apos;s the app.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
