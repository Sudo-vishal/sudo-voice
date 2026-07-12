import LogoMark from "./Logo";
import Reveal from "./Reveal";

/* The core pitch as one visual: messy speech in → clean text out. */
export default function TransformStrip() {
  return (
    <section id="what-it-does" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-16 text-center">
            <div className="kicker mb-4">$ echo $SPEECH | sudovoice</div>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Speak at 150 WPM.
              <br />
              <span className="text-[#4A5C7C]">Read like you edited it.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10">
            {/* you say */}
            <div className="term">
              <div className="term-bar">
                <span className="flex items-end gap-[3px] h-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="wave-bar w-[3px] bg-[#FFBD2E]" style={{ height: 6 }} />
                  ))}
                </span>
                <span className="ml-2 font-mono text-xs text-[#5C6E8A]">you — speaking</span>
                <span className="ml-auto font-mono text-xs text-[#FFBD2E]">raw</span>
              </div>
              <div className="p-6 font-mono text-[14px] leading-7 text-[#8FA3BF] italic min-h-[120px]">
                &ldquo;um okay so basically can you uh refactor this function to
                use async await instead of like promises&rdquo;
              </div>
            </div>

            {/* the machine in the middle */}
            <div className="flex lg:flex-col items-center justify-center gap-3">
              <span className="hidden lg:block font-mono text-[#3D4E6B] text-lg">↓</span>
              <div className="relative">
                <div className="absolute inset-[-18px] rounded-full bg-[#00E676]/15 blur-2xl" />
                <div className="relative chip-float">
                  <LogoMark size={72} />
                </div>
              </div>
              <span className="hidden lg:block font-mono text-[#00E676] text-lg">↓</span>
              <span className="lg:hidden font-mono text-[#00E676] text-lg">→</span>
            </div>

            {/* sudovoice writes */}
            <div className="border-glow">
              <div className="term !border-0">
                <div className="term-bar">
                  <span className="w-2 h-2 rounded-full bg-[#00E676]" />
                  <span className="ml-1 font-mono text-xs text-[#5C6E8A]">sudovoice — writes</span>
                  <span className="ml-auto font-mono text-xs text-[#00E676]">cleaned · 0.3s</span>
                </div>
                <div className="p-6 font-mono text-[14px] leading-7 min-h-[120px]">
                  <span className="text-[#E6EDF7] bg-[#00E676]/10 px-1.5 py-0.5 rounded">
                    Refactor this function to use async/await instead of promises.
                  </span>
                  <span className="inline-block w-2 h-4 bg-[#00E676] align-middle animate-blink ml-1" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-10 text-center font-mono text-[13px] text-[#5C6E8A]">
            press one key · start talking · clean, formatted text lands at your cursor
          </p>
        </Reveal>
      </div>
    </section>
  );
}
