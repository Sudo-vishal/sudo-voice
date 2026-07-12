import LogoMark, { Wordmark } from "./Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-[#1C2940]">
      <div className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <LogoMark size={36} />
                <div className="flex items-center">
                  <Wordmark className="text-lg" />
                  <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#1C2940] text-[#5C6E8A]">
                    community edition
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#8FA3BF] max-w-sm leading-relaxed">
                Offline voice-to-text that types at your cursor. Whisper on your
                machine, LLM cleanup, zero third-party tracking. For Windows,
                macOS, and Android.
              </p>
              <div className="mt-4 font-mono text-xs text-[#5C6E8A]">
                $ audio --stays local&nbsp;&nbsp;·&nbsp;&nbsp;cloud sync only if you sign in
              </div>
            </div>

            {/* Product links */}
            <div>
              <h4 className="font-mono text-xs text-[#5C6E8A] mb-4">// product</h4>
              <ul className="space-y-3 font-mono text-[13px] text-[#8FA3BF]">
                <li><a href="/#features" className="hover:text-[#00E676] transition-colors">flags</a></li>
                <li><a href="/#models" className="hover:text-[#00E676] transition-colors">models</a></li>
                <li><a href="/#latency" className="hover:text-[#00E676] transition-colors">latency-trace</a></li>
                <li><a href="/pricing" className="hover:text-[#00E676] transition-colors">pricing</a></li>
                <li><a href="/docs" className="hover:text-[#00E676] transition-colors">docs</a></li>
                <li><a href="/changelog" className="hover:text-[#00E676] transition-colors">changelog</a></li>
                <li><a href="/#download" className="hover:text-[#00E676] transition-colors">download</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="font-mono text-xs text-[#5C6E8A] mb-4">// connect</h4>
              <ul className="space-y-3 font-mono text-[13px] text-[#8FA3BF]">
                <li>
                  <a href="https://github.com/Sudo-vishal/SudoVoice" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E676] transition-colors">
                    github
                  </a>
                </li>
                <li>
                  <a href="https://youtube.com/@AiwithVishal" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E676] transition-colors">
                    youtube
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/in/aiwithvishal" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E676] transition-colors">
                    linkedin
                  </a>
                </li>
                <li>
                  <a href="https://aiwithvishal.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E676] transition-colors">
                    portfolio
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-mono text-xs text-[#5C6E8A] mb-4">// legal</h4>
              <ul className="space-y-3 font-mono text-[13px] text-[#8FA3BF]">
                <li><a href="/privacy" className="hover:text-[#00E676] transition-colors">privacy</a></li>
                <li><a href="/terms" className="hover:text-[#00E676] transition-colors">terms</a></li>
                <li><a href="/terms#refund" className="hover:text-[#00E676] transition-colors">refunds</a></li>
                <li>
                  <a href="mailto:support@sudovoice.com" className="hover:text-[#00E676] transition-colors break-all">
                    support@
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Giant watermark */}
          <div className="overflow-hidden -mb-4 mt-4 select-none" aria-hidden="true">
            <div className="watermark text-center">sudovoice</div>
          </div>

          {/* Bottom bar */}
          <div className="h-px w-full mb-6 bg-[#1C2940]" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-[#5C6E8A]">
            <div>
              © {new Date().getFullYear()} sudovoice · AGPL-3.0 · built by{" "}
              <a href="https://aiwithvishal.com" target="_blank" rel="noopener noreferrer" className="text-[#8FA3BF] hover:text-[#00E676] transition-colors">
                AiwithVishal
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span>no third-party tracking</span>
              <span className="text-[#1C2940]">|</span>
              <span>mumbai data region</span>
              <span className="text-[#1C2940]">|</span>
              <span>delete anytime</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
