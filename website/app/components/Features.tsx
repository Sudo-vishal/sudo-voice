export default function Features() {
  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
        </svg>
      ),
      title: "On-Device AI",
      description: "Whisper models run entirely on your Mac. No internet needed, no cloud processing, no data ever leaves your machine.",
      accent: "from-emerald-500/20 to-emerald-600/5",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
      ),
      title: "Auto-Type Anywhere",
      description: "Text appears directly at your cursor. Works in VS Code, Slack, Chrome, Terminal — literally any app on your Mac.",
      accent: "from-cyan-500/20 to-cyan-600/5",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      title: "Smart Punctuation",
      description: 'Say "comma", "period", "question mark", or "new paragraph" and it inserts the right punctuation automatically.',
      accent: "from-green-500/20 to-green-600/5",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
          <path d="m9 6-3 6 3 6" />
        </svg>
      ),
      title: "Voice Commands",
      description: '"Scratch that" to undo the last phrase. "Delete word" to remove a word. "Clear all" to start fresh. Hands-free editing.',
      accent: "from-orange-500/20 to-orange-600/5",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      ),
      title: "AI Text Cleanup",
      description: "Optional LLM polish with 7 providers (Groq, Claude, OpenAI, Gemini). Fix grammar and formatting in real-time.",
      accent: "from-teal-500/20 to-teal-600/5",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      title: "Hindi / Hinglish",
      description: "Speak in Hindi or Hinglish, get clean English text. Built specifically for Indian developers and creators.",
      accent: "from-amber-500/20 to-amber-600/5",
    },
  ];

  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Everything You Need.{" "}
            <span className="gradient-text">Nothing You Don&apos;t.</span>
          </h2>
          <p className="mt-4 text-[#9FB0C7] text-lg max-w-xl mx-auto">
            Professional voice transcription without the subscription tax.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const glowClass = i === 0 ? "glow-card-blue" : i === 1 ? "glow-card-purple" : i === 4 ? "glow-card-purple" : i === 5 ? "glow-card-green" : "";
            const floatClass = i % 3 === 0 ? "animate-float" : i % 3 === 1 ? "animate-float-delayed" : "animate-float-slow";
            return (
            <div
              key={feature.title}
              className={`glass-card group rounded-2xl p-6 ${glowClass} ${floatClass}`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-4 text-white/80 group-hover:text-white transition-colors`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-[#9FB0C7] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
