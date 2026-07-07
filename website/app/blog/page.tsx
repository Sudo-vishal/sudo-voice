import { posts } from "./posts";
import Link from "next/link";
import type { Metadata } from "next";
import LogoMark, { Wordmark } from "../components/Logo";

export const metadata: Metadata = {
  title: "Blog — SudoVoice | Voice AI, Productivity, Privacy",
  description: "Articles on voice AI, typing speed, on-device privacy, Whisper models, and developer productivity. By AiwithVishal.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#04070F]">
      {/* Nav */}
      <nav className="border-b border-[#1C2940] bg-[#04070F]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <Wordmark className="text-base" />
            <span className="font-mono text-xs text-[#5C6E8A]">/blog</span>
          </Link>
          <Link href="/#download" className="font-mono text-[13px] text-[#8FA3BF] hover:text-[#00E676] transition-colors">
            download
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="kicker mb-3">$ cat /var/log/sudovoice/*.md</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Field notes</h1>
        <p className="text-[#8FA3BF] text-lg mb-12">Engineering stories, privacy deep-dives, and what we learn building voice AI.</p>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block glass-card glow-card-purple rounded-2xl p-6 md:p-8 transition-all hover:translate-y-[-2px]"
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {post.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                    {tag}
                  </span>
                ))}
                <span className="text-xs text-[#5C6E8A]">{post.readTime} read</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-[#8FA3BF] text-sm leading-relaxed">
                {post.description}
              </p>
              <div className="mt-4 text-sm text-emerald-400 flex items-center gap-1">
                Read article
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
