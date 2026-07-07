export default function Download() {
  return (
    <section id="download" className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold">
          Ready to <span className="gradient-text">Start Speaking?</span>
        </h2>
        <p className="mt-4 text-[#9FB0C7] text-lg max-w-xl mx-auto">
          Download SudoVoice, grant two permissions, and you&apos;re live in 60 seconds.
        </p>

        {/* Two-platform download grid */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* macOS download */}
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center w-full">
              <span className="absolute inset-0 rounded-2xl btn-pulse-ring" />
              <span className="absolute inset-0 rounded-2xl btn-pulse-ring" style={{ animationDelay: "0.8s" }} />
              <a
                href="/releases/SudoVoice-v2.6.0.dmg"
                className="relative glow-blue inline-flex items-center justify-center gap-3 w-full px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-lg hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Download for macOS
                <span className="text-emerald-200 text-sm font-normal">.dmg</span>
              </a>
            </div>
            <div className="mt-3 text-sm text-[#6B7A93]">v2.6.0 · 4 MB · macOS 14+</div>
          </div>

          {/* Windows download */}
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center w-full">
              <span className="absolute inset-0 rounded-2xl btn-pulse-ring" />
              <span className="absolute inset-0 rounded-2xl btn-pulse-ring" style={{ animationDelay: "0.8s" }} />
              <a
                href="/releases/windows/SudoVoice%20Setup%202.2.3.exe"
                className="relative glow-cyan inline-flex items-center justify-center gap-3 w-full px-8 py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold text-lg hover:from-cyan-500 hover:to-cyan-400 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
                Download for Windows
                <span className="text-cyan-200 text-sm font-normal">.exe</span>
              </a>
            </div>
            <div className="mt-3 text-sm text-[#6B7A93]">v2.2.3 · ~85 MB · Windows 10/11 (x64)</div>
          </div>
        </div>

        {/* First-time install — Gatekeeper + SmartScreen bypass (expanded by default) */}
        <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Mac bypass */}
          <div className="glass-card rounded-2xl p-6 text-left border border-[#4FC3F7]/20">
            <h3 className="font-semibold text-base text-white mb-2 leading-snug">
              macOS may say &quot;not opened&quot; or &quot;Apple could not verify&quot;
            </h3>
            <p className="text-[#9FB0C7] text-sm leading-relaxed mb-5">
              Normal for apps not yet notarized by Apple. SudoVoice runs fully on-device — your audio never leaves your Mac unless you sign in for cloud sync. Here&apos;s the one-time approval:
            </p>
            <ol className="space-y-2.5 text-sm text-[#9FB0C7]">
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">1.</span>
                <span>Open SudoVoice from Applications. macOS blocks it — click <strong className="text-white font-medium">Done</strong> (do not click Move to Trash).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">2.</span>
                <span>Open <strong className="text-white font-medium">System Settings &rarr; Privacy &amp; Security</strong>, scroll to the <strong className="text-white font-medium">Security</strong> section.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">3.</span>
                <span>Next to &quot;SudoVoice was blocked,&quot; click <strong className="text-white font-medium">Open Anyway</strong> &rarr; confirm with Touch ID or password.</span>
              </li>
            </ol>
            <p className="text-[#6B7A93] text-xs mt-5 leading-relaxed">
              One-time only — future launches are silent. On older macOS (13 and earlier) you can instead right-click the app &rarr; <strong className="text-[#9FB0C7] font-medium">Open</strong> &rarr; Open.
            </p>
          </div>

          {/* Windows bypass */}
          <div className="glass-card rounded-2xl p-6 text-left border border-[#4FC3F7]/20">
            <h3 className="font-semibold text-base text-white mb-2 leading-snug">
              Windows SmartScreen may say &quot;Windows protected your PC&quot;
            </h3>
            <p className="text-[#9FB0C7] text-sm leading-relaxed mb-5">
              Same story — Windows flags installers that haven&apos;t built reputation yet. We&apos;re building that reputation one user at a time; the installer is exactly what the download button serves, checksummed on every release.
            </p>
            <ol className="space-y-2.5 text-sm text-[#9FB0C7]">
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">1.</span>
                <span>Click <strong className="text-white font-medium">More info</strong> (small text under the warning)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">2.</span>
                <span>Click <strong className="text-white font-medium">Run anyway</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#4FC3F7] font-semibold tabular-nums shrink-0 w-5">3.</span>
                <span>The installer launches normally</span>
              </li>
            </ol>
            <p className="text-[#6B7A93] text-xs mt-5 leading-relaxed">
              If the installer hangs: right-click the <code className="bg-white/5 px-1.5 py-0.5 rounded text-[11px] font-mono text-[#E2E8F0]">.exe</code> &rarr; <strong className="text-white font-medium">Properties</strong> &rarr; tick <strong className="text-white font-medium">Unblock</strong> &rarr; <strong className="text-white font-medium">Apply</strong> &rarr; re-run.
            </p>
          </div>
        </div>

        {/* Linux coming soon (single pill) */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-[#6B7A93] text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="21.17" x2="12" y1="8" y2="8" />
              <line x1="3.95" x2="8.54" y1="6.06" y2="14" />
              <line x1="10.88" x2="15.46" y1="21.94" y2="14" />
            </svg>
            Linux — Coming Soon
          </div>
        </div>

        {/* System requirements — both platforms */}
        <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* macOS reqs */}
          <div className="glass-card glow-card-purple animate-float rounded-2xl p-6 text-left">
            <h3 className="font-semibold mb-4 text-sm text-[#9FB0C7] uppercase tracking-wider">macOS Requirements</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-6"><span className="text-[#6B7A93] shrink-0">OS</span><span>macOS 14 Sonoma or later</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">Chip</span><span>Apple Silicon &amp; Intel</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">RAM</span><span>4 GB min (8 GB for Large)</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">Disk</span><span>75 MB — 3 GB</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">Internet</span><span>Only for first model download</span></div>
            </div>
          </div>

          {/* Windows reqs */}
          <div className="glass-card glow-card-purple animate-float rounded-2xl p-6 text-left">
            <h3 className="font-semibold mb-4 text-sm text-[#9FB0C7] uppercase tracking-wider">Windows Requirements</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-6"><span className="text-[#6B7A93] shrink-0">OS</span><span>Windows 10 / 11 (x64)</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">CPU</span><span className="text-right">x64 (Intel/AMD); ARM via x64 emulation</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">RAM</span><span>4 GB min (8 GB for Large)</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">GPU</span><span className="text-right">Vulkan-capable for 6× speedup (AMD/NVIDIA/Intel modern)</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">Disk</span><span>200 MB — 3 GB</span></div>
              <div className="flex justify-between gap-6 border-t border-white/5 pt-3"><span className="text-[#6B7A93] shrink-0">Internet</span><span className="text-right">Only for first model download (or Groq cloud STT)</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
