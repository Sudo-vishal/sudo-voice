import { posts } from "./posts";
import Link from "next/link";
import type { Metadata } from "next";
import LogoMark, { Wordmark } from "../components/Logo";
import Reveal from "../components/Reveal";
import Spotlight from "../components/Spotlight";

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

        <div className="space-y-5">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={Math.min(i, 4) * 70}>
              <Spotlight className="panel panel-hover group">
                <Link href={`/blog/${post.slug}`} className="block p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#00E676]/[0.08] text-[#00E676] border border-[#00E676]/20">
                        {tag}
                      </span>
                    ))}
                    <span className="font-mono text-[11px] text-[#5C6E8A]">{post.readTime} read</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-2 tracking-tight group-hover:text-[#7CFFC4] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[#8FA3BF] text-sm leading-relaxed">
                    {post.description}
                  </p>
                  <div className="mt-4 font-mono text-[13px] text-[#00E676] flex items-center gap-1.5">
                    cat article.md
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
