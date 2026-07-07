"use client";

import { useEffect, useState } from "react";
import HeroCanvas from "./HeroCanvas";

const TYPEWRITER_TEXT = "Building the future with voice...";
const TYPEWRITER_SPEED = 60; // ms per character
const RESET_DELAY = 2000; // ms to wait after full text before reset

export default function Hero() {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayed.length < TYPEWRITER_TEXT.length) {
      timeout = setTimeout(() => {
        setDisplayed(TYPEWRITER_TEXT.slice(0, displayed.length + 1));
      }, TYPEWRITER_SPEED);
    } else if (!isDeleting && displayed.length === TYPEWRITER_TEXT.length) {
      timeout = setTimeout(() => setIsDeleting(true), RESET_DELAY);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => {
        setDisplayed(TYPEWRITER_TEXT.slice(0, displayed.length - 1));
      }, TYPEWRITER_SPEED / 2);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
    }

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting]);

  return (
    <section className="hero-gradient relative min-h-screen flex items-center justify-center px-6 pt-16">
      {/* Animated particle background */}
      <HeroCanvas />
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-[#9FB0C7] mb-8">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1 bg-emerald-500 rounded-full wave-bar"
                style={{ height: 8 }}
              />
            ))}
          </div>
          Voice to Text at the Speed of Thought
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up animation-delay-200 text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
          Stop Typing.
          <br />
          <span className="gradient-text">Start Speaking.</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up animation-delay-400 mt-6 text-lg md:text-xl text-[#9FB0C7] max-w-2xl mx-auto leading-relaxed">
          Voice-to-text for Mac, Windows, and Chrome. Hindi, Hinglish, English.
          On-device by default — your audio recordings <span className="text-white font-medium">never leave your machine</span>. Sign in for cross-device transcript sync.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up animation-delay-600 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#download"
            className="glow-blue inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            See Downloads
          </a>
          <a
            href="https://github.com/Sudo-vishal/sudovoice"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Star on GitHub
          </a>
        </div>
        <div className="animate-fade-in-up animation-delay-600 mt-3 text-sm text-[#6B7A93]">
          Mac · Windows · Chrome · 100% Free · No subscription
        </div>

        {/* Stats */}
        <div className="mt-16 flex items-center justify-center gap-8 md:gap-16 text-center">
          {[
            { value: "Audio", label: "Stays Local" },
            { value: "0", label: "Cloud Calls" },
            { value: "Free", label: "No Subscription" },
            { value: "42x", label: "Real-time Speed" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
              <div className="text-xs md:text-sm text-[#6B7A93] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Floating indicator preview */}
        <div className="mt-16 relative">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0E1626] border border-white/10 shadow-2xl">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-subtle-pulse" />
            <span className="text-sm text-[#9FB0C7]">Ready</span>
            <span className="text-sm text-[#6B7A93]">—</span>
            <span className="text-sm font-mono text-white">Cmd + D</span>
            <span className="text-sm text-[#6B7A93]">to start</span>
          </div>
        </div>

        {/* Typewriter demo */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-0 rounded-xl bg-[#0A1120] border border-white/8 shadow-xl overflow-hidden">
            {/* Terminal header dots */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-r border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="px-5 py-2.5 flex items-center gap-2 min-w-[280px]">
              <span className="text-emerald-400 text-xs font-mono select-none">$ sudo voice</span>
              <span className="text-[#6B7A93] text-xs font-mono select-none">→</span>
              <span className="text-[#E2E8F0] text-xs font-mono">{displayed}</span>
              <span className="w-0.5 h-3.5 bg-emerald-400 animate-blink inline-block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
