"use client";

import { useState } from "react";

export default function Calculator() {
  const [hoursTyping, setHoursTyping] = useState(3);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  // Average typing speed: 40 WPM, speaking speed: 150 WPM → 3.75x faster
  const speedMultiplier = 3.75;
  const weeklyTypingHours = hoursTyping * daysPerWeek;
  const weeklyWithVoice = weeklyTypingHours / speedMultiplier;
  const weeklySaved = weeklyTypingHours - weeklyWithVoice;
  const monthlySaved = weeklySaved * 4.3;
  const yearlySaved = weeklySaved * 52;

  // Money value: assume avg hourly rate
  const hourlyRate = 25; // USD
  const yearlyMoneySaved = Math.round(yearlySaved * hourlyRate);

  const typingBarWidth = Math.round((40 / 150) * 100); // 40 WPM as % of 150 WPM

  return (
    <section id="calculator" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="kicker mb-4">$ time --spent-typing</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Typing is <span className="text-[#5C6E8A]">your bottleneck.</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            You speak at 150 WPM and type at 40. Run the numbers on what the gap costs you.
          </p>
          <div className="mt-4 font-mono text-[13px] text-[#FFBD2E]">
            ⚠ the average professional loses 800+ hours/year to typing
          </div>
        </div>

        {/* Speed comparison bar */}
        <div className="glass-card rounded-2xl p-6 mb-6 glow-card-blue">
          <div className="text-xs text-[#5C6E8A] uppercase tracking-widest mb-4 text-center">Speed Comparison</div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8FA3BF] flex items-center gap-2">
                  <span className="text-base">⌨️</span> Typing speed
                </span>
                <span className="text-sm font-bold text-[#5C6E8A]">40 WPM</span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#5C6E8A]/60 transition-all duration-700"
                  style={{ width: `${typingBarWidth}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8FA3BF] flex items-center gap-2">
                  <span className="text-base">🎙️</span> Speaking speed
                </span>
                <span className="text-sm font-bold text-emerald-400">150 WPM</span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700 w-full" />
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className="text-2xl font-bold gradient-text">3.75x faster</span>
            <span className="text-[#5C6E8A] text-sm ml-2">with your voice</span>
          </div>
        </div>

        <div className="glass-card glow-card-purple animate-float-slow rounded-2xl p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Inputs */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Hours spent typing per day</label>
                  <span className="text-2xl font-bold text-emerald-400">{hoursTyping}h</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={hoursTyping}
                  onChange={(e) => setHoursTyping(parseFloat(e.target.value))}
                  className="range-slider w-full cursor-pointer"
                  style={{
                    "--range-fill": `${((hoursTyping - 1) / 9) * 100}%`,
                    "--range-color": "#00E676",
                  } as React.CSSProperties}
                />
                <div className="flex justify-between text-xs text-[#5C6E8A] mt-1">
                  <span>1h</span>
                  <span>10h</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Days per week</label>
                  <span className="text-2xl font-bold text-cyan-400">{daysPerWeek}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  step={1}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                  className="range-slider w-full cursor-pointer"
                  style={{
                    "--range-fill": `${((daysPerWeek - 1) / 6) * 100}%`,
                    "--range-color": "#4FC3F7",
                  } as React.CSSProperties}
                />
                <div className="flex justify-between text-xs text-[#5C6E8A] mt-1">
                  <span>1 day</span>
                  <span>7 days</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-start gap-2 text-sm text-[#5C6E8A]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Based on industry averages: 40 WPM typing vs 150 WPM speaking (Natural Language Processing Institute)
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="text-xs text-[#5C6E8A] uppercase tracking-widest">Your time savings with voice</div>
              </div>

              {/* Weekly — hero stat */}
              <div className="glass-card rounded-xl p-5 text-center border border-green-500/20 bg-green-500/5">
                <div className="text-xs text-[#5C6E8A] uppercase tracking-widest mb-1">Weekly hours saved</div>
                <div className="text-5xl font-black text-green-400 leading-none">{weeklySaved.toFixed(1)}h</div>
                <div className="text-xs text-green-400/70 mt-1">every single week</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{Math.round(monthlySaved)}h</div>
                  <div className="text-xs text-[#5C6E8A] mt-1">per month</div>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{Math.round(yearlySaved)}h</div>
                  <div className="text-xs text-[#5C6E8A] mt-1">per year</div>
                </div>
              </div>

              {/* Money — the wow factor */}
              <div className="border-glow">
              <div className="bg-[#081020] p-5 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-xs text-[#5C6E8A] uppercase tracking-widest mb-1">Value of time saved</div>
                  <div className="text-5xl font-black text-green-400 leading-none tracking-tight">
                    ${yearlyMoneySaved.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-400/70 mt-1 font-medium">per year at $25/hr</div>
                  <div className="mt-3 text-xs text-[#5C6E8A] bg-white/5 rounded-lg px-3 py-1.5 inline-block">
                    That&apos;s ${Math.round(yearlyMoneySaved / 12).toLocaleString()}/month you could reclaim
                  </div>
                </div>
              </div>
              </div>

              <div className="text-center pt-1">
                <a
                  href="#download"
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Start saving time now
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
