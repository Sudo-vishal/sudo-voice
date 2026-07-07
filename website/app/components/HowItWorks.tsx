export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Press the Hotkey",
      description: "Hit Cmd+D from anywhere. The floating indicator turns cyan — you're live.",
      floatClass: "animate-float",
      glowClass: "glow-card-blue",
      icon: (
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14203A] border border-white/10 font-mono text-sm">
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs">⌘</kbd>
          <span className="text-[#6B7A93]">+</span>
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs">D</kbd>
        </div>
      ),
    },
    {
      number: "02",
      title: "Speak Naturally",
      description: 'Talk like you normally would. Say "comma", "new line", or "scratch that" to edit.',
      floatClass: "animate-float-delayed",
      glowClass: "glow-card-purple",
      icon: (
        <div className="flex items-center gap-1 h-10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-cyan-500 rounded-full wave-bar"
              style={{ height: 8 }}
            />
          ))}
        </div>
      ),
    },
    {
      number: "03",
      title: "Text Appears Instantly",
      description: "Transcribed text is typed at your cursor — any app, any field. Zero friction.",
      floatClass: "animate-float-slow",
      glowClass: "glow-card-green",
      icon: (
        <div className="font-mono text-sm text-[#9FB0C7]">
          Hello world<span className="animate-blink text-emerald-500">|</span>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Three Steps. <span className="gradient-text">That&apos;s It.</span>
          </h2>
          <p className="mt-4 text-[#9FB0C7] text-lg max-w-xl mx-auto">
            No setup wizards. No cloud accounts. No configuration files.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`glass-card ${step.glowClass} ${step.floatClass} rounded-2xl p-8`}
            >
              <div className="text-5xl font-bold text-white/5 mb-4">{step.number}</div>
              <div className="mb-6">{step.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-[#9FB0C7] text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
