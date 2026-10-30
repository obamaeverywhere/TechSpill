import type { SourceAdapter } from "./types.js";
import { fetchSource } from "../utils/http.js";
export const gnewsBangladeshAdapter: SourceAdapter = {
  async collect(source) {
    if (!source.feedUrl || !process.env.GNEWS_API_KEY)
      throw new Error("GNews credential not configured");
    const language = process.env.GNEWS_BD_LANGUAGE || "en";
    if (!["en", "bn"].includes(language))
      throw new Error("Invalid GNews Bangladesh language");
    const url = new URL(source.feedUrl);
    url.search = new URLSearchParams({
      q: language === "bn" ? "বাংলাদেশ প্রযুক্তি" : "Bangladesh technology",
      lang: language,
      sortby: "publishedAt",
      max: "10",
      apikey: process.env.GNEWS_API_KEY,
    }).toString();
    const data = JSON.parse(
      (await fetchSource(url.href, {}, fetch, { maxRetries: 0 })).text,
    );
    if (!Array.isArray(data.articles))
      throw new Error("Invalid GNews response");
    return {
      articles: data.articles.map((a: any) => ({
        title: a.title,
        url: a.url,
        description: a.description,
        imageUrl: a.image,
        publishedAt: a.publishedAt,
        publisherName: a.source?.name,
        language,
      })),
    };
  },
};
