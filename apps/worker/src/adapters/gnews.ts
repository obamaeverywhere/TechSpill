import { fetchSource } from "../utils/http.js";
import type { SourceAdapter } from "./types.js";
export const gnewsAdapter: SourceAdapter = {
  async collect(source) {
    if (!source.feedUrl) throw new Error("No verified feed configured");
    if (!process.env.GNEWS_API_KEY)
      throw new Error("GNews credential not configured");
    const u = new URL(source.feedUrl);
    u.search = new URLSearchParams({
      category: "technology",
      lang: "en",
      max: "10",
      apikey: process.env.GNEWS_API_KEY,
    }).toString();
    const payload = JSON.parse(
      (await fetchSource(u.href, {}, fetch, { maxRetries: 0 })).text,
    );
    if (!Array.isArray(payload.articles))
      throw new Error("Invalid GNews response");
    return {
      articles: payload.articles.map((a: any) => ({
        title: a.title,
        url: a.url,
        description: a.description,
        imageUrl: a.image,
        publishedAt: a.publishedAt,
        language: "en",
        publisherName: a.source?.name,
      })),
    };
  },
};
