import { fetchSource, mapBounded } from "../utils/http.js";
import type { SourceAdapter } from "./types.js";
import type { RawArticle } from "../processors/article.js";
export function normalizeHackerNews(item: any): RawArticle | null {
  if (
    !item ||
    item.type !== "story" ||
    item.dead ||
    item.deleted ||
    !Number.isInteger(item.id) ||
    typeof item.title !== "string" ||
    !Number.isFinite(item.time)
  )
    return null;
  return {
    externalId: String(item.id),
    title: item.title,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    description: item.text,
    author: item.by,
    publishedAt: new Date(item.time * 1000),
    hnScore:
      Number.isInteger(item.score) && item.score >= 0 ? item.score : undefined,
  };
}
export const hackerNewsAdapter: SourceAdapter = {
  async collect(source) {
    if (!source.feedUrl) throw new Error("No verified feed configured");
    const ids = JSON.parse((await fetchSource(source.feedUrl)).text);
    if (!Array.isArray(ids)) throw new Error("Invalid Hacker News index");
    let warnings = 0;
    const articles = await mapBounded(
      ids
        .filter(Number.isInteger)
        .slice(0, Math.min(100, Number(process.env.HN_STORY_LIMIT || 35))),
      4,
      async (id) => {
        try {
          return normalizeHackerNews(
            JSON.parse(
              (
                await fetchSource(
                  `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
                )
              ).text,
            ),
          );
        } catch {
          warnings++;
          return null;
        }
      },
    );
    if (!articles.some(Boolean) && ids.length)
      throw new Error("All Hacker News items failed");
    return {
      articles: articles.filter((a): a is RawArticle => a !== null),
      warnings,
    };
  },
};
