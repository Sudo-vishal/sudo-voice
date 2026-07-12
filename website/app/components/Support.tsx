/* Support channels as a systemctl-style status listing — not a card grid. */
const CHANNELS = [
  {
    cmd: "sudovoice report-bug",
    status: "open",
    color: "#FF5F57",
    desc: "GitHub issue with the log line — fixes ship fast",
    href: "https://github.com/Sudo-vishal/SudoVoice/issues/new?template=bug_report.md",
    link: "github issues",
  },
  {
    cmd: "sudovoice request-feature",
    status: "open",
    color: "#4FC3F7",
    desc: "the roadmap is built from these",
    href: "https://github.com/Sudo-vishal/SudoVoice/issues/new?template=feature_request.md",
    link: "feature template",
  },
  {
    cmd: "sudovoice follow",
    status: "live",
    color: "#00E676",
    desc: "tutorials, release notes, builds-in-public",
    href: "https://youtube.com/@AiwithVishal",
    link: "youtube.com/@AiwithVishal",
  },
];

export default function Support() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-10">
          <div className="kicker mb-4">$ systemctl status sudovoice-support</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Maintained. <span className="text-[#5C6E8A]">Actively.</span>
          </h2>
        </div>

        <div className="term overflow-x-auto">
          <div className="term-bar">
            <span className="font-mono text-xs text-[#5C6E8A]">support.service</span>
            <span className="ml-auto font-mono text-xs text-[#00E676]">
              ● active (running)
            </span>
          </div>
          <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[13.5px] leading-8 min-w-[560px]">
            {CHANNELS.map((c) => (
              <a
                key={c.cmd}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block whitespace-nowrap rounded px-3 py-1.5 -mx-3 hover:bg-[#00E676]/[0.04] transition-colors group"
              >
                <span style={{ color: c.color }}>●</span>{" "}
                <span className="text-[#E6EDF7] inline-block min-w-[230px]">{c.cmd}</span>
                <span className="text-[#5C6E8A]">
                  [{c.status}] {c.desc} ·{" "}
                </span>
                <span className="text-[#4FC3F7] group-hover:text-[#00E676] transition-colors">
                  {c.link} ↗
                </span>
              </a>
            ))}
            <div className="mt-4 text-[#3D4E6B]">
              # updates announced on youtube — the app checks for new versions automatically
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
