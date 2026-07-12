import Reveal from "./Reveal";

/* Pricing as a config file dump — compact, links out to /pricing. */
export default function PricingSnippet() {
  return (
    <section id="pricing-preview" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ cat /etc/sudovoice/tiers.conf</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Free by default. <span className="text-[#5C6E8A]">Paid by choice.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term overflow-x-auto">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">tiers.conf</span>
              <span className="ml-auto font-mono text-xs text-[#5C6E8A]">read-only</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[14px] leading-8 min-w-[560px]">
              <div className="whitespace-pre">
                <span className="text-[#00E676]">[free]</span>
                <span className="text-[#5C6E8A]">      $0 forever    </span>
                <span className="text-[#8FA3BF]">60 min/day on-device · auto-type everywhere · 1 device</span>
              </div>
              <div className="whitespace-pre">
                <span className="text-[#4FC3F7]">[pro]</span>
                <span className="text-[#5C6E8A]">       $12/mo · $99/yr </span>
                <span className="text-[#8FA3BF]">unlimited · all 5 models · all 7 llm providers · 3 devices</span>
              </div>
              <div className="whitespace-pre">
                <span className="text-[#FFBD2E]">[lifetime]</span>
                <span className="text-[#5C6E8A]">  $249 once     </span>
                <span className="text-[#8FA3BF]">everything forever · 5 devices · first 100 buyers</span>
              </div>
              <div className="mt-3 text-[#3D4E6B]">
                # 30-day money-back · AGPL source means you can also self-host for $0
              </div>
              <div className="mt-5 flex flex-wrap gap-4 font-sans">
                <a href="#download" className="btn-primary px-6 py-3 text-sm">
                  Download free
                </a>
                <a href="/pricing" className="btn-ghost px-6 py-3 text-sm font-semibold">
                  Full pricing →
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
