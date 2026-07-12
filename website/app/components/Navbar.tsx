"use client";

import { useState, useEffect } from "react";
import LogoMark, { Wordmark } from "./Logo";

const LINKS: [string, string][] = [
  ["/#try-it", "demo"],
  ["/#how-it-works", "how"],
  ["/#features", "features"],
  ["/#models", "models"],
  ["/docs", "docs"],
  ["/changelog", "changelog"],
  ["/blog", "blog"],
  ["/pricing", "pricing"],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled || open
          ? "bg-[#04070F]/85 backdrop-blur-xl border-[#1C2940]"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <Wordmark className="text-[17px]" />
          <span className="hidden sm:inline ml-1 font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#1C2940] text-[#5C6E8A]">
            v2.6.0
          </span>
        </a>

        <div className="hidden md:flex items-center gap-7 font-mono text-[13px] text-[#8FA3BF]">
          {LINKS.map(([href, label]) => (
            <a
              key={label}
              href={href}
              className="relative group hover:text-[#E6EDF7] transition-colors"
            >
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#00E676] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Sudo-vishal/SudoVoice"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="SudoVoice on GitHub"
            className="p-2 text-[#8FA3BF] hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <a href="/#download" className="hidden sm:inline-flex btn-primary px-4 py-2 text-sm font-mono">
            download
          </a>

          {/* mobile menu toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-[#8FA3BF] hover:text-white transition-colors"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-[#1C2940] bg-[#04070F]/95 backdrop-blur-xl px-6 py-4">
          <div className="flex flex-col gap-1 font-mono text-[14px]">
            {LINKS.map(([href, label]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[#8FA3BF] hover:text-[#00E676] transition-colors border-b border-[#0D1626] last:border-0"
              >
                <span className="text-[#00E676] mr-2">&gt;</span>
                {label}
              </a>
            ))}
            <a
              href="/#download"
              onClick={() => setOpen(false)}
              className="btn-primary justify-center px-4 py-3 text-sm font-mono mt-3"
            >
              download
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
