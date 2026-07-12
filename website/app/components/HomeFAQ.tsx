import Reveal from "./Reveal";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Does my audio ever leave my device?",
    a: "No — by default Whisper runs entirely on your machine and the network stays silent. Cloud only enters if you explicitly enable optional extras: an LLM cleanup provider, Gemini Live streaming, or signed-in transcript sync. All three are off until you turn them on.",
  },
  {
    q: "Is it actually free?",
    a: "Yes. The free tier (60 min/day, on-device, auto-type everywhere) is free forever — no credit card, no trial clock. Pro adds unlimited use and every model/provider. And the whole codebase is AGPL-3.0, so you can self-host everything for $0.",
  },
  {
    q: "Which platforms are supported?",
    a: "macOS 14+ (Apple Silicon and Intel) and Windows 10/11 today. A Chrome extension is in review, and Linux is on the roadmap.",
  },
  {
    q: "How is this different from macOS dictation or Wispr Flow?",
    a: "Three ways: it's offline by default (Apple's dictation and most rivals route audio through the cloud), an LLM strips your filler words before the text lands, and there's no subscription required — the core app is free and open source.",
  },
  {
    q: "Does it handle Hindi and Hinglish?",
    a: "Yes — speak Hindi or code-switched Hinglish and get clean English text out. It's tuned for accents most dictation tools ignore.",
  },
  {
    q: "Can I read the code?",
    a: "All of it. SudoVoice is AGPL-3.0 on GitHub — the Mac app, the Android app, and this website. Audit the audio path yourself; that's the point.",
  },
];

export default function HomeFAQ() {
  return (
    <section id="faq" className="py-28 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <Reveal>
          <div className="mb-12 text-center">
            <div className="kicker mb-4">$ man faq</div>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Questions, answered.
            </h2>
          </div>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={Math.min(i, 4) * 60}>
              <details className="group panel open:border-[#00E676]/40 open:bg-[#00E676]/[0.02] transition-colors">
                <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 text-sm md:text-base font-medium text-white">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[13px] text-[#00E676]">?</span>
                    {item.q}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#5C6E8A] group-open:rotate-180 group-open:text-[#00E676] transition-transform shrink-0 ml-3"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 pl-[46px] -mt-1 text-sm text-[#8FA3BF] leading-relaxed">
                  {item.a}
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
