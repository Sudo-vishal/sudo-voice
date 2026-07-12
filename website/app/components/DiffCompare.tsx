import Reveal from "./Reveal";

/* Competitor comparison as a unified diff — four lines, not a feature matrix. */
const REMOVED: { name: string; detail: string }[] = [
  { name: "wispr flow", detail: "$12/mo · audio → their cloud · closed source" },
  { name: "superwhisper", detail: "$8.49/mo · mac only" },
  { name: "macos dictation", detail: "free · audio → apple servers · keeps the “um”" },
];

export default function DiffCompare() {
  return (
    <section id="comparison" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-10">
            <div className="kicker mb-4">$ git diff dictation-tools</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              The diff is <span className="text-[#5C6E8A]">the pitch.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="term overflow-x-auto">
            <div className="term-bar">
              <span className="font-mono text-xs text-[#5C6E8A]">tools.diff</span>
              <span className="ml-auto font-mono text-xs">
                <span className="text-[#FF5F57]">-3</span>{" "}
                <span className="text-[#00E676]">+1</span>
              </span>
            </div>
            <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[14px] leading-8 min-w-[540px]">
              <div className="text-[#5C6E8A]">@@ your dictation setup @@</div>
              {REMOVED.map((r) => (
                <div key={r.name} className="whitespace-pre bg-[#FF5F57]/[0.05] text-[#B96A72] rounded-sm px-2 -mx-2">
                  <span className="text-[#FF5F57]">- </span>
                  <span className="line-through decoration-[#FF5F57]/50">
                    {r.name.padEnd(17)}{r.detail}
                  </span>
                </div>
              ))}
              <div className="whitespace-pre bg-[#00E676]/[0.07] rounded-sm px-2 -mx-2">
                <span className="text-[#00E676]">+ </span>
                <span className="text-[#00E676] font-semibold">{"sudovoice".padEnd(17)}</span>
                <span className="text-[#C6D3E8]">
                  $0 · offline whisper.cpp · win/mac/android · AGPL-3.0
                </span>
              </div>
              <div className="mt-4 text-[#3D4E6B]">
                # apply with: <span className="text-[#8FA3BF]">$ sudovoice --install</span>{" "}
                <a href="#download" className="text-[#00E676] hover:underline">↓ download</a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
