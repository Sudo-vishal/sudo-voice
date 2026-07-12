export default function Comparison() {
  const tools = [
    {
      name: "sudovoice",
      price: "$0",
      priceDetail: "no limits",
      privacy: "on-device",
      hindiSupport: true,
      openSource: true,
      llmCleanup: true,
      voiceCommands: true,
      highlighted: true,
    },
    {
      name: "Wispr Flow",
      price: "$8/mo",
      priceDetail: "~$96/yr",
      privacy: "cloud",
      hindiSupport: false,
      openSource: false,
      llmCleanup: true,
      voiceCommands: true,
      highlighted: false,
    },
    {
      name: "BridgeVoice",
      price: "$50/mo",
      priceDetail: "~$600/yr",
      privacy: "on-device",
      hindiSupport: false,
      openSource: false,
      llmCleanup: false,
      voiceCommands: false,
      highlighted: false,
    },
    {
      name: "macOS Dictation",
      price: "free",
      priceDetail: "built-in",
      privacy: "cloud (Apple)",
      hindiSupport: false,
      openSource: false,
      llmCleanup: false,
      voiceCommands: false,
      highlighted: false,
    },
  ];

  const Yes = () => <span className="font-mono text-[#00E676]">[x]</span>;
  const No = () => <span className="font-mono text-[#33415C]">[ ]</span>;

  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-14">
          <div className="kicker mb-4">$ diff sudovoice everything-else</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Why pay <span className="text-[#5C6E8A]">for less?</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            Same job, no subscription, and the source is public.
          </p>
        </div>

        <div className="term overflow-x-auto">
          <div className="term-bar">
            <span className="font-mono text-xs text-[#5C6E8A]">comparison.tsv</span>
          </div>
          <table className="w-full min-w-[640px] font-mono text-[13px]">
            <thead>
              <tr className="border-b border-[#1C2940]">
                <th className="text-left px-6 py-4 text-[#5C6E8A] font-normal">field</th>
                {tools.map((tool) => (
                  <th
                    key={tool.name}
                    className={`text-center px-4 py-4 font-semibold ${
                      tool.highlighted ? "text-[#00E676]" : "text-[#8FA3BF]"
                    }`}
                  >
                    {tool.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#101A2E]">
                <td className="px-6 py-3.5 text-[#5C6E8A]">price</td>
                {tools.map((tool) => (
                  <td key={tool.name} className="text-center px-4 py-3.5">
                    <div className={tool.highlighted ? "text-[#00E676] font-semibold" : "text-[#E6EDF7]"}>{tool.price}</div>
                    <div className="text-xs text-[#5C6E8A]">{tool.priceDetail}</div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-[#101A2E]">
                <td className="px-6 py-3.5 text-[#5C6E8A]">privacy</td>
                {tools.map((tool) => (
                  <td key={tool.name} className={`text-center px-4 py-3.5 ${tool.highlighted ? "text-[#00E676]" : "text-[#8FA3BF]"}`}>
                    {tool.privacy}
                  </td>
                ))}
              </tr>
              {[
                { label: "hindi/hinglish", key: "hindiSupport" as const },
                { label: "open source", key: "openSource" as const },
                { label: "llm cleanup", key: "llmCleanup" as const },
                { label: "voice commands", key: "voiceCommands" as const },
              ].map((row) => (
                <tr key={row.label} className="border-b border-[#101A2E]">
                  <td className="px-6 py-3.5 text-[#5C6E8A]">{row.label}</td>
                  {tools.map((tool) => (
                    <td key={tool.name} className="text-center px-4 py-3.5">
                      {tool[row.key] ? <Yes /> : <No />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
