/* Full-bleed brand-green closer — black on phosphor, glyph pattern right. */
export default function CTABlock() {
  return (
    <section className="relative overflow-hidden bg-[#00E676]">
      {/* glyph pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[55%] font-mono font-bold text-black/[0.12] select-none pointer-events-none leading-none"
        style={{ fontSize: "7rem", letterSpacing: "-0.05em" }}
      >
        <div className="absolute -right-6 top-4 rotate-0">&gt;_&nbsp;&gt;&gt;</div>
        <div className="absolute right-40 top-32">&gt;&gt;&nbsp;$&nbsp;&gt;_</div>
        <div className="absolute -right-2 bottom-6">$&nbsp;&gt;&gt;&nbsp;&gt;_</div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24">
        <div className="font-mono text-[12px] tracking-[0.2em] uppercase text-black/60 mb-4">
          // join early access
        </div>
        <h2 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] text-black leading-[1.05]">
          Get root access
          <br />
          to your voice.
        </h2>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href="#download"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg bg-black text-[#00E676] font-mono font-semibold text-base hover:bg-[#0A1220] hover:-translate-y-0.5 transition-all shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)]"
          >
            $ sudovoice --install
          </a>
          <span className="font-mono text-[13px] text-black/70">
            free forever · no credit card · open source
          </span>
        </div>
      </div>
    </section>
  );
}
