import { posts } from "./posts";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — SudoVoice | Voice AI, Productivity, Privacy",
  description: "Articles on voice AI, typing speed, on-device privacy, Whisper models, and developer productivity. By AiwithVishal.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#070D16]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#070D16]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <span className="font-semibold">SudoVoice</span>
            <span className="text-xs text-[#6B7A93]">/ Blog</span>
          </Link>
          <Link href="/#download" className="text-sm text-[#9FB0C7] hover:text-white transition-colors">
            Download App
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
        <p className="text-[#9FB0C7] text-lg mb-12">Research, insights, and guides on voice AI, productivity, and building with Whisper.</p>

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
                <span className="text-xs text-[#6B7A93]">{post.readTime} read</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-[#9FB0C7] text-sm leading-relaxed">
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
