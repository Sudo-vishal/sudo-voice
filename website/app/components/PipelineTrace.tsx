import Reveal from "./Reveal";

/* The speed story as a profiler trace — per-stage timings, not a calculator. */
const STAGES: {
  t: string;
  name: string;
  width: string; // bar width as % of total
  color: string;
  note: string;
}[] = [
  {
    t: "0.000s",
    name: "mic",
    width: "8%",
    color: "#FFBD2E",
    note: "16kHz capture + voice activity detection",
  },
  {
    t: "+0.04s",
    name: "whisper.cpp",
    width: "46%",
    color: "#4FC3F7",
    note: "on-device transcription · 42x realtime · streams partials while you speak",
  },
  {
    t: "+0.10s",
    name: "cleanup",
    width: "22%",
    color: "#4FC3F7",
    note: "LLM strips fillers, fixes grammar (optional — skip it, stay fully offline)",
  },
  {
    t: "+0.30s",
    name: "cursor",
    width: "10%",
    color: "#00E676",
    note: "clean text typed into the focused app",
  },
];

export default function PipelineTrace() {
  return (
    <section id="latency" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ sudovoice --trace</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Release the key.
              <br />
              <span className="text-[#5C6E8A]">0.3s later it&apos;s typed.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">trace: hold → speak → release → typed</span>
              <span className="ml-auto font-mono text-xs text-[#00E676]">total 0.3s</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[13px]">
              <div className="space-y-4">
                {STAGES.map((s) => (
                  <div key={s.name}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-[#5C6E8A] inline-block min-w-[64px]">
                        [{s.t}]
                      </span>
                      <span className="font-semibold" style={{ color: s.color }}>
                        {s.name}
                      </span>
                      <span className="text-[#5C6E8A]">{s.note}</span>
                    </div>
                    <div className="mt-1.5 ml-[76px] h-2 rounded-sm bg-[#0D1626] overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: s.width,
                          background: s.color,
                          opacity: 0.75,
                          boxShadow: `0 0 12px ${s.color}66`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 pipe-track h-px bg-gradient-to-r from-[#FFBD2E]/30 via-[#4FC3F7]/30 to-[#00E676]/40">
                <div className="pipe-dot" />
              </div>

              <div className="mt-6 text-[#3D4E6B] leading-6">
                # partials stream to your cursor while you&apos;re still talking —
                <br /># by the time you release the key, most of the sentence already landed.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
