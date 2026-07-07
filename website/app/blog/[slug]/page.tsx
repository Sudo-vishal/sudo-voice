import { posts } from "../posts";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = posts.find((p) => p.slug === slug);
    if (!post) return { title: "Not Found" };
    return {
      title: `${post.title} — SudoVoice Blog`,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        url: `https://sudovoice.com/blog/${post.slug}`,
      },
    };
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#070D16]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#070D16]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-[#9FB0C7] hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All articles
          </Link>
          <Link href="/#download" className="text-sm text-[#4FC3F7] hover:text-[#4FC3F7]/80 transition-colors">
            Download SudoVoice
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {post.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-[#4FC3F7]/10 text-[#4FC3F7] text-xs border border-[#4FC3F7]/20">
              {tag}
            </span>
          ))}
          <span className="text-xs text-[#6B7A93]">{post.date} · {post.readTime} read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{post.title}</h1>
        <p className="text-lg text-[#9FB0C7] mb-8 leading-relaxed">{post.description}</p>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10 pb-10 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-[#4FC3F7] flex items-center justify-center text-sm font-bold text-black">D</div>
          <div>
            <div className="text-sm font-medium">Vishal</div>
            <div className="text-xs text-[#6B7A93]">AIwithVishal · AI Builder</div>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-white
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-[#9FB0C7] prose-p:leading-relaxed
            prose-a:text-[#4FC3F7] prose-a:no-underline hover:prose-a:text-[#4FC3F7]/80
            prose-strong:text-white
            prose-li:text-[#9FB0C7]
            prose-code:text-[#E2E8F0] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-table:text-sm
            prose-th:text-left prose-th:text-[#6B7A93] prose-th:font-medium prose-th:border-white/5
            prose-td:text-[#9FB0C7] prose-td:border-white/5
          "
          dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
        />

        {/* CTA */}
        <div className="mt-16 glass-card glow-card-cyan rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to stop typing?</h3>
          <p className="text-[#9FB0C7] text-sm mb-6">Free voice-to-text for Mac, Windows, and Chrome. No subscription.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#download"
              className="px-6 py-3 rounded-xl bg-[#4FC3F7] text-black font-semibold text-sm hover:bg-[#4FC3F7]/90 transition-all"
            >
              See Downloads
            </Link>
            <Link
              href="/#try-it"
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
            >
              Try Live Demo
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

// Simple markdown to HTML (handles ##, ###, **, `, ```, |tables|, -, links)
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-white/5 rounded-xl p-4 overflow-x-auto my-4"><code>$2</code></pre>')
    // Tables
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
      const ths = header.split('|').filter(Boolean).map((h: string) => `<th class="px-4 py-2 border-b border-white/10">${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((d: string) => `<td class="px-4 py-2 border-b border-white/5">${d.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<div class="overflow-x-auto my-6"><table class="w-full"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // List items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li's in ul
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc pl-6 space-y-1 my-4">$1</ul>')
    // Paragraphs (lines that aren't already wrapped)
    .replace(/^(?!<[hupldto])((?!<).+)$/gm, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '');

  return html;
}
