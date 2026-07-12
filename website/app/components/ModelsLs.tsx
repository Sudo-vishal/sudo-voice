import Reveal from "./Reveal";

/* Whisper models as `ls -lh` output — a directory listing, not a plan table. */
const MODELS: {
  size: string;
  file: string;
  note: string;
  recommended?: boolean;
}[] = [
  { size: " 75M", file: "tiny.bin", note: "fastest · quick notes on old hardware" },
  { size: "140M", file: "base.bin", note: "daily driver — accuracy/speed sweet spot", recommended: true },
  { size: "460M", file: "small.bin", note: "accents, jargon, long-form work" },
  { size: "1.5G", file: "large-v3-turbo.bin", note: "near-max accuracy, still quick" },
  { size: "3.0G", file: "large-v3.bin", note: "maximum accuracy · research-grade" },
];

export default function ModelsLs() {
  return (
    <section id="models" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ ls -lh ~/.sudovoice/models</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Disk space is <span className="text-[#5C6E8A]">the only price.</span>
            </h2>
            <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
              Five Whisper models, all free, all local. Download once, run offline
              forever, switch anytime in settings.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term overflow-x-auto">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">~/.sudovoice/models</span>
              <span className="ml-auto font-mono text-xs text-[#5C6E8A]">5 files</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[13.5px] leading-8 min-w-[560px]">
              <div className="text-[#5C6E8A]">total 5.2G</div>
              {MODELS.map((m) => (
                <div
                  key={m.file}
                  className={`whitespace-pre rounded px-2 -mx-2 ${
                    m.recommended
                      ? "bg-[#00E676]/[0.06] shadow-[inset_2px_0_0_#00E676]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="text-[#3D4E6B]">-rw-r--r--</span>{" "}
                  <span className="text-[#4FC3F7]">{m.size}</span>{" "}
                  <span className={m.recommended ? "text-[#00E676] font-semibold" : "text-[#E6EDF7]"}>
                    {m.file.padEnd(20)}
                  </span>
                  <span className="text-[#5C6E8A]">
                    # {m.note}
                    {m.recommended && <span className="text-[#00E676]"> ← default</span>}
                  </span>
                </div>
              ))}
              <div className="mt-3 text-[#3D4E6B]">
                # tiny + base ship free · every model unlocked with pro — see{" "}
                <a href="/pricing" className="text-[#8FA3BF] hover:text-[#00E676] transition-colors underline underline-offset-4 decoration-[#1C2940]">
                  pricing
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
