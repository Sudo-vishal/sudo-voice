import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { releases } from "./releases";

export const metadata: Metadata = {
  title: "Changelog — SudoVoice",
  description:
    "Every SudoVoice release — Windows, macOS, and Android. What shipped, when.",
};

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-24 px-6 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="mb-14">
            <div className="kicker mb-4">$ git log --oneline --tags</div>
            <h1 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.02em] leading-tight">
              Changelog
            </h1>
            <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
              Every release, straight from the tags. Windows, macOS, and Android
              build from the same source.
            </p>
          </div>

          <div className="relative border-l border-[#1C2940] ml-2 pl-8 space-y-12">
            {releases.map((rel) => (
              <article key={rel.version} className="relative">
                {/* commit dot */}
                <span
                  className={`absolute -left-[37px] top-1.5 w-[9px] h-[9px] rounded-full ${
                    rel.latest
                      ? "bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.7)]"
                      : "bg-[#33415C]"
                  }`}
                  aria-hidden="true"
                />

                <div className="flex flex-wrap items-center gap-3 mb-3 font-mono text-[13px]">
                  <span className="px-2.5 py-1 rounded border border-[#00E676]/40 bg-[#00E676]/[0.07] text-[#00E676] font-semibold">
                    tag: {rel.version}
                  </span>
                  {rel.date && <span className="text-[#5C6E8A]">{rel.date}</span>}
                  {rel.latest && (
                    <span className="px-2 py-0.5 rounded border border-[#4FC3F7]/40 text-[#4FC3F7] text-[11px] uppercase tracking-wider">
                      latest
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
                  {rel.title}
                </h2>

                <ul className="space-y-2.5 font-mono text-[13px] text-[#8FA3BF] leading-relaxed">
                  {rel.notes.map((note) => (
                    <li key={note} className="flex items-start gap-2.5">
                      <span className="text-[#00E676] shrink-0 mt-px">+</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-16 panel px-5 py-3.5 font-mono text-[13px] text-[#8FA3BF] inline-flex items-center gap-3">
            <span className="text-[#00E676]">i</span>
            full commit history on{" "}
            <a
              href="https://github.com/Sudo-vishal/SudoVoice/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E676] hover:underline"
            >
              github releases
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
