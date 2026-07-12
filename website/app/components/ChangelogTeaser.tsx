import { releases } from "@/app/changelog/releases";

/* git-log-style teaser of the latest releases → /changelog */
const HASHES = ["2f6a01c", "8c41b2e", "5d09aa1", "c3e77f0"];

export default function ChangelogTeaser() {
  const latest = releases.slice(0, 3);

  return (
    <section id="releases" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-10">
          <div className="kicker mb-4">$ git log --oneline --tags -3</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Shipped, <span className="text-[#5C6E8A]">not promised.</span>
          </h2>
        </div>

        <div className="term overflow-x-auto">
          <div className="term-bar">
            <span className="font-mono text-xs text-[#5C6E8A]">HEAD → main</span>
            <span className="ml-auto font-mono text-xs text-[#00E676]">up to date with origin</span>
          </div>
          <div className="p-6 md:p-8 font-mono text-[12.5px] md:text-[13.5px] leading-8 min-w-[520px]">
            {latest.map((rel, i) => (
              <div key={rel.version} className="whitespace-nowrap">
                <span className="text-[#FFBD2E]">* {HASHES[i]}</span>{" "}
                <span className="text-[#00E676]">
                  (tag: {rel.version}
                  {rel.latest ? ", HEAD" : ""})
                </span>{" "}
                <span className="text-[#C6D3E8]">{rel.title.toLowerCase()}</span>
                <span className="text-[#5C6E8A]">
                  {rel.date ? ` · ${rel.date}` : ""}
                </span>
              </div>
            ))}
            <div className="mt-4">
              <a
                href="/changelog"
                className="text-[#8FA3BF] hover:text-[#00E676] transition-colors"
              >
                <span className="text-[#00E676]">$</span> git log --all{" "}
                <span className="text-[#5C6E8A]">→ full changelog</span> ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
