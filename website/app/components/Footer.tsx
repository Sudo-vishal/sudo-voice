import LogoMark, { Wordmark } from "./Logo";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Top gradient divider */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(0, 230, 118,0.1) 15%, rgba(79, 195, 247,0.3) 40%, rgba(79, 195, 247,0.4) 50%, rgba(79, 195, 247,0.3) 60%, rgba(0, 230, 118,0.1) 85%, transparent 100%)",
        }}
      />

      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main footer grid */}
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <LogoMark size={40} />
                <div>
                  <Wordmark className="text-lg" />
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Community Edition</span>
                </div>
              </div>
              <p className="text-sm text-[#9FB0C7] max-w-sm leading-relaxed">
                Voice-to-text for Mac, Windows, and Chrome. Hindi, Hinglish, English. Speak naturally, type instantly. No third-party tracking, ever.
              </p>
              <div className="flex items-center gap-1 mt-4 text-xs text-[#6B7A93]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                On-device by default · Cloud sync only when you sign in
              </div>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-3 text-sm text-[#6B7A93]">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#calculator" className="hover:text-white transition-colors">ROI Calculator</a></li>
                <li><a href="#models" className="hover:text-white transition-colors">Models</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#download" className="hover:text-white transition-colors">Download</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">Connect</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://youtube.com/@AiwithVishal" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6B7A93] hover:text-red-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.8 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.8-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
                    YouTube
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Sudo-vishal" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6B7A93] hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/in/aiwithvishal" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6B7A93] hover:text-emerald-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43c-1.14 0-2.07-.93-2.07-2.07s.93-2.07 2.07-2.07 2.07.93 2.07 2.07-.93 2.07-2.07 2.07zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://aiwithvishal.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6B7A93] hover:text-cyan-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Portfolio
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-3 text-sm text-[#6B7A93]">
                <li><a href="/privacy" className="hover:text-[#4FC3F7] transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-[#4FC3F7] transition-colors">Terms of Service</a></li>
                <li><a href="/terms#refund" className="hover:text-[#4FC3F7] transition-colors">Refunds</a></li>
                <li>
                  <a href="mailto:support@sudovoice.com" className="hover:text-[#4FC3F7] transition-colors break-all">
                    support@sudovoice.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="h-px w-full mb-6"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
            }}
          />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7A93]">
            <div className="flex items-center gap-1">
              &copy; {new Date().getFullYear()} SudoVoice. Built by{" "}
              <a href="https://aiwithvishal.com" target="_blank" rel="noopener noreferrer" className="text-[#9FB0C7] hover:text-white transition-colors ml-1">
                AiwithVishal
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span>No third-party tracking</span>
              <span className="text-white/10">|</span>
              <span>Mumbai data region</span>
              <span className="text-white/10">|</span>
              <span>Delete anytime</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
