export default function ModelTable() {
  const models = [
    {
      name: "Tiny",
      size: "75 MB",
      speed: "Fastest",
      accuracy: "Good",
      best: "Quick notes, short phrases",
      recommended: false,
    },
    {
      name: "Base",
      size: "140 MB",
      speed: "Fast",
      accuracy: "Better",
      best: "Daily use",
      recommended: true,
    },
    {
      name: "Small",
      size: "460 MB",
      speed: "Medium",
      accuracy: "Great",
      best: "Professional work",
      recommended: false,
    },
    {
      name: "Large V3 Turbo",
      size: "1.5 GB",
      speed: "Slower",
      accuracy: "Excellent",
      best: "Maximum accuracy",
      recommended: false,
    },
    {
      name: "Large V3",
      size: "3 GB",
      speed: "Slowest",
      accuracy: "Best",
      best: "Research, long-form",
      recommended: false,
    },
  ];

  return (
    <section id="models" className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-14">
          <div className="kicker mb-4">$ sudovoice --model</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Pick your model. <span className="text-[#5C6E8A]">All free.</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            Downloads once, runs offline forever. Pick the size that fits your machine.
          </p>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {models.map((model) => (
            <div
              key={model.name}
              className={`glass-card rounded-xl p-5 ${
                model.recommended ? "border-emerald-500/30 ring-1 ring-emerald-500/20" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{model.name}</h3>
                {model.recommended && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    Recommended
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-[#5C6E8A]">Size:</span> {model.size}</div>
                <div><span className="text-[#5C6E8A]">Speed:</span> {model.speed}</div>
                <div><span className="text-[#5C6E8A]">Accuracy:</span> {model.accuracy}</div>
                <div className="col-span-2"><span className="text-[#5C6E8A]">Best for:</span> {model.best}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block glass-card glow-card-purple animate-float-slow rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6E8A]">Model</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6E8A]">Size</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6E8A]">Speed</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6E8A]">Accuracy</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6E8A]">Best For</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr
                  key={model.name}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                    model.recommended ? "bg-emerald-500/[0.03]" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{model.name}</span>
                      {model.recommended && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#8FA3BF]">{model.size}</td>
                  <td className="px-6 py-4 text-[#8FA3BF]">{model.speed}</td>
                  <td className="px-6 py-4 text-[#8FA3BF]">{model.accuracy}</td>
                  <td className="px-6 py-4 text-[#8FA3BF]">{model.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
