"use client";

import { useEffect, useRef, useState } from "react";

/* Big count-up stats that animate when scrolled into view. */
const STATS = [
  { to: 42, suffix: "x", label: "faster than realtime", mono: "whisper on-device" },
  { to: 0, suffix: "", label: "cloud calls while you speak", mono: "audio stays local" },
  { to: 100, prefix: "~", suffix: "ms", label: "LLM cleanup latency", mono: "filler stripped live" },
  { to: 0, prefix: "$", suffix: "", label: "forever, for the core app", mono: "AGPL-3.0 source" },
];

function Counter({ to, prefix = "", suffix = "", start }: { to: number; prefix?: string; suffix?: string; start: boolean }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (to === 0) { setVal(0); return; }
    const t0 = performance.now();
    const dur = 1400;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, to]);

  return (
    <span className="tabular-nums">
      {prefix}{val}{suffix}
    </span>
  );
}

export default function StatsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative px-6 py-16">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#14213A] rounded-2xl overflow-hidden border border-[#14213A]">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[#060D1A] px-8 py-9 group hover:bg-[#081020] transition-colors">
            <div className="text-4xl md:text-5xl font-bold gradient-text leading-none">
              <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} start={seen} />
            </div>
            <div className="mt-3 text-sm text-[#8FA3BF]">{s.label}</div>
            <div className="mt-1.5 font-mono text-[11px] text-[#3D4E6B] group-hover:text-[#00E676]/70 transition-colors">
              # {s.mono}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
