import Reveal from "./Reveal";
import Spotlight from "./Spotlight";

/* Compact pricing on the homepage — full detail lives at /pricing. */
export default function PricingPreview() {
  return (
    <section id="pricing-preview" className="py-28 px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-14 text-center">
            <div className="kicker mb-4">$ cat tiers.conf | head</div>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Start free.
              <br />
              <span className="text-[#4A5C7C]">Upgrade when it earns its keep.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <Reveal delay={80}>
            <Spotlight className="panel panel-hover p-7 h-full flex flex-col">
              <div className="font-mono text-[13px] text-[#00E676]">--free</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold">$0</span>
                <span className="font-mono text-xs text-[#5C6E8A]">forever · no credit card</span>
              </div>
              <ul className="mt-5 space-y-2 font-mono text-[13px] text-[#8FA3BF] flex-1">
                <li><span className="text-[#00E676]">[x]</span> 60 min/day on-device transcription</li>
                <li><span className="text-[#00E676]">[x]</span> auto-type into any app</li>
                <li><span className="text-[#00E676]">[x]</span> voice commands + smart punctuation</li>
                <li><span className="text-[#00E676]">[x]</span> AGPL source — self-host everything</li>
              </ul>
              <a href="#download" className="btn-ghost mt-6 px-5 py-3 text-sm font-semibold">
                Download free
              </a>
            </Spotlight>
          </Reveal>

          <Reveal delay={160}>
            <div className="border-glow h-full">
              <Spotlight className="bg-[#081020] rounded-[13px] p-7 h-full flex flex-col">
                <div className="font-mono text-[13px] text-[#00E676]">--pro</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold gradient-text">$12</span>
                  <span className="font-mono text-xs text-[#5C6E8A]">/mo · $99/yr · $249 lifetime</span>
                </div>
                <ul className="mt-5 space-y-2 font-mono text-[13px] text-[#8FA3BF] flex-1">
                  <li><span className="text-[#00E676]">[x]</span> unlimited transcription</li>
                  <li><span className="text-[#00E676]">[x]</span> all 5 Whisper models + 7 LLM providers</li>
                  <li><span className="text-[#00E676]">[x]</span> Gemini Live streaming + batch files</li>
                  <li><span className="text-[#00E676]">[x]</span> up to 5 devices</li>
                </ul>
                <a href="/pricing" className="btn-primary mt-6 px-5 py-3 text-sm">
                  See full pricing
                </a>
              </Spotlight>
            </div>
          </Reveal>
        </div>

        <Reveal delay={240}>
          <p className="mt-8 text-center font-mono text-[12px] text-[#5C6E8A]">
            30-day money-back · lifetime capped at the first 100 buyers
          </p>
        </Reveal>
      </div>
    </section>
  );
}
