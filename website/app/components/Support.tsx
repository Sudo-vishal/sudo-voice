export default function Support() {
  const channels = [
    {
      cmd: "report_bug()",
      title: "Something broke?",
      body: "Open an issue on GitHub with the log line — fixes ship fast.",
      href: "https://github.com/Sudo-vishal/SudoVoice/issues/new?template=bug_report.md",
      accent: "#FF5F57",
    },
    {
      cmd: "request_feature()",
      title: "Missing something?",
      body: "Tell us what you need. The roadmap is built from these.",
      href: "https://github.com/Sudo-vishal/SudoVoice/issues/new?template=feature_request.md",
      accent: "#4FC3F7",
    },
    {
      cmd: "join_community()",
      title: "Follow along",
      body: "Tutorials, release notes, and builds-in-public on YouTube.",
      href: "https://youtube.com/@AiwithVishal",
      accent: "#00E676",
    },
  ];

  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="kicker mb-4">$ sudovoice --support</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Maintained. <span className="text-[#5C6E8A]">Actively.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {channels.map((c) => (
            <a
              key={c.cmd}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="panel panel-hover p-6 group"
            >
              <div className="font-mono text-[14px] mb-3" style={{ color: c.accent }}>
                {c.cmd}
              </div>
              <h3 className="font-semibold mb-1.5">{c.title}</h3>
              <p className="text-sm text-[#8FA3BF] leading-relaxed">{c.body}</p>
              <div className="mt-4 font-mono text-xs text-[#5C6E8A] group-hover:text-[#00E676] transition-colors">
                open →
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 panel px-5 py-3.5 font-mono text-[13px] text-[#8FA3BF] inline-flex items-center gap-3">
          <span className="text-[#00E676]">i</span>
          updates announced on{" "}
          <a
            href="https://youtube.com/@AiwithVishal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00E676] hover:underline"
          >
            youtube
          </a>{" "}
          — the app checks for new versions automatically.
        </div>
      </div>
    </section>
  );
}
