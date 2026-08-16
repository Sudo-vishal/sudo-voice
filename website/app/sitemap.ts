import type { MetadataRoute } from "next";
import { posts } from "./blog/posts";

const BASE = "https://sudovoice.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/account`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
