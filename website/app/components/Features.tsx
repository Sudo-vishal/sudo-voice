import Reveal from "./Reveal";
import Spotlight from "./Spotlight";

/* Bento grid: two flagship cards with live visuals + four flag cards,
   all with mouse-tracking spotlight. */
export default function Features() {
  return (
    <section id="features" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-16">
            <div className="kicker mb-4">$ sudovoice --help</div>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Everything you need.
              <br />
              <span className="text-[#4A5C7C]">Nothing you don&apos;t.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-6 gap-4">
          {/* flagship: offline */}
          <Reveal className="md:col-span-3" delay={0}>
            <Spotlight className="panel panel-hover p-7 h-full flex flex-col">
              <div className="font-mono text-[15px] text-[#00E676] mb-3">--offline</div>
              <h3 className="text-xl font-semibold mb-2">Whisper runs on your machine</h3>
              <p className="text-[#8FA3BF] text-[15px] leading-relaxed mb-6">
                No internet required, no cloud processing, nothing to subpoena.
                Five model sizes from 75&nbsp;MB to 3&nbsp;GB.
              </p>
              <div className="mt-auto term text-[12px] font-mono">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[#5C6E8A]">network monitor</span>
                  <span className="text-[#00E676]">▉ 0 B/s upstream</span>
                </div>
                <div className="px-4 pb-3 flex gap-1 items-end h-10">
                  {[3, 5, 2, 7, 4, 6, 3, 8, 5, 2, 6, 4, 7, 3, 5, 6, 2, 4, 8, 3, 5, 7, 4, 6].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-[#00E676]/25" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
                <div className="px-4 pb-3 text-[#3D4E6B]"># all inference local — the graph above is your CPU, not your data leaving</div>
              </div>
            </Spotlight>
          </Reveal>

          {/* flagship: cleanup */}
          <Reveal className="md:col-span-3" delay={100}>
            <Spotlight className="panel panel-hover p-7 h-full flex flex-col">
              <div className="font-mono text-[15px] text-[#00E676] mb-3">--cleanup</div>
              <h3 className="text-xl font-semibold mb-2">The &ldquo;um&rdquo; never lands</h3>
              <p className="text-[#8FA3BF] text-[15px] leading-relaxed mb-6">
                An LLM rewrites your rambling into clean prose in ~100ms.
                Groq, Claude, OpenAI, Gemini + 3 more providers.
              </p>
              <div className="mt-auto term font-mono text-[12px]">
                <div className="px-4 py-3 space-y-2">
                  <div className="text-[#5C6E8A] line-through decoration-[#FF5F57]/60">
                    like you know the the server is is down again
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00E676]">→</span>
                    <span className="text-[#E6EDF7] bg-[#00E676]/10 px-1.5 py-0.5 rounded">The server is down again.</span>
                  </div>
                </div>
              </div>
            </Spotlight>
          </Reveal>

          {/* four flag cards */}
          {[
            {
              flag: "--auto-type",
              title: "Types at your cursor",
              body: "VS Code, Slack, Chrome, Terminal — any app, any text field.",
            },
            {
              flag: "--voice-commands",
              title: "Hands-free editing",
              body: "“Scratch that” undoes. “Delete word”, “clear all” — no keyboard.",
            },
            {
              flag: "--punctuation",
              title: "Smart punctuation",
              body: "Say “comma” or “new paragraph” — the character, not the word.",
            },
            {
              flag: "--hindi",
              title: "Hindi / Hinglish",
              body: "Speak Hinglish, get clean English. Tuned for accents others ignore.",
            },
          ].map((f, i) => (
            <Reveal key={f.flag} className="md:col-span-3 lg:col-span-3" delay={i * 80}>
              <Spotlight className="panel panel-hover p-6 h-full">
                <div className="font-mono text-[14px] text-[#00E676] mb-2.5">{f.flag}</div>
                <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
                <p className="text-[#8FA3BF] text-sm leading-relaxed">{f.body}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
