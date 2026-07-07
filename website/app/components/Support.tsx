export default function Support() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold">
            Need Help? <span className="gradient-text">We&apos;re Here.</span>
          </h2>
          <p className="mt-4 text-[#9FB0C7] text-lg max-w-xl mx-auto">
            Report bugs, request features, or just say hi.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Bug Report */}
          <a
            href="https://github.com/Sudo-vishal/sudovoice/issues/new?template=bug_report.md"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card glow-card-blue animate-float rounded-2xl p-6 text-center group cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/5 flex items-center justify-center mb-4 group-hover:from-red-500/30 transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Report a Bug</h3>
            <p className="text-sm text-[#6B7A93]">Something broken? Let us know on GitHub.</p>
          </a>

          {/* Feature Request */}
          <a
            href="https://github.com/Sudo-vishal/sudovoice/issues/new?template=feature_request.md"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card glow-card-purple animate-float-delayed rounded-2xl p-6 text-center group cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 flex items-center justify-center mb-4 group-hover:from-cyan-500/30 transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Request a Feature</h3>
            <p className="text-sm text-[#6B7A93]">Got an idea? We build what you need.</p>
          </a>

          {/* Community */}
          <a
            href="https://youtube.com/@AiwithVishal"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card glow-card-green animate-float-slow rounded-2xl p-6 text-center group cursor-pointer"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/5 flex items-center justify-center mb-4 group-hover:from-green-500/30 transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Join Community</h3>
            <p className="text-sm text-[#6B7A93]">Tutorials, updates, and more on YouTube.</p>
          </a>
        </div>

        {/* Auto-update note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl glass-card text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            <span className="text-[#9FB0C7]">
              Updates announced on{" "}
              <a href="https://youtube.com/@AiwithVishal" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                YouTube
              </a>{" "}
              — download the latest version from this page.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
