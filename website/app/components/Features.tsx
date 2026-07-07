/* Features as CLI flags — man-page style. */
export default function Features() {
  const features = [
    {
      flag: "--offline",
      title: "On-device Whisper",
      description:
        "Speech recognition runs entirely on your machine. No internet required, no cloud processing, nothing to leak.",
    },
    {
      flag: "--auto-type",
      title: "Types at your cursor",
      description:
        "Clean text lands wherever your cursor is — VS Code, Slack, Chrome, Terminal. Any app, any text field.",
    },
    {
      flag: "--cleanup",
      title: "LLM filler removal",
      description:
        "“um okay so basically” never reaches your document. Optional cleanup via Groq, Claude, OpenAI, Gemini + 3 more.",
    },
    {
      flag: "--punctuation",
      title: "Smart punctuation",
      description:
        "Say “comma”, “period”, “new paragraph” — the right character is inserted, not the word.",
    },
    {
      flag: "--voice-commands",
      title: "Hands-free editing",
      description:
        "“Scratch that” undoes the last phrase. “Delete word”, “clear all” — edit without touching the keyboard.",
    },
    {
      flag: "--hindi",
      title: "Hindi / Hinglish",
      description:
        "Speak Hindi or Hinglish, get clean English text out. Tuned for accents most tools ignore.",
    },
  ];

  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-14">
          <div className="kicker mb-4">$ sudovoice --help</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Everything you need. <span className="text-[#5C6E8A]">Nothing you don&apos;t.</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            Professional dictation without the subscription tax.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.flag} className="panel panel-hover p-6 group">
              <div className="font-mono text-[15px] text-[#00E676] mb-3">
                {f.flag}
              </div>
              <h3 className="text-base font-semibold mb-2 text-[#E6EDF7]">{f.title}</h3>
              <p className="text-[#8FA3BF] text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
