import { PrismaClient } from "@prisma/client";
import { BANGLADESH_SOURCES } from "./bangladesh-sources.js";
export { BANGLADESH_SOURCES } from "./bangladesh-sources.js";
export const db = new PrismaClient();
export { Prisma } from "@prisma/client";
export const SOURCE_CATALOG = [
  {
    slug: "techcrunch",
    name: "TechCrunch",
    websiteUrl: "https://techcrunch.com",
    feedUrl: "https://techcrunch.com/feed/",
    color: "#19a76a",
    allowImages: true,
  },
  {
    slug: "the-verge",
    name: "The Verge",
    websiteUrl: "https://www.theverge.com",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    color: "#b34fff",
    allowImages: true,
  },
  {
    slug: "ars-technica",
    name: "Ars Technica",
    websiteUrl: "https://arstechnica.com",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    color: "#ff6633",
    allowImages: true,
  },
  {
    slug: "wired",
    name: "WIRED",
    websiteUrl: "https://www.wired.com",
    feedUrl: "https://www.wired.com/feed/rss",
    color: "#292b30",
    allowImages: true,
  },
  {
    slug: "engadget",
    name: "Engadget",
    websiteUrl: "https://www.engadget.com",
    feedUrl: "https://www.engadget.com/rss.xml",
    color: "#3384e8",
    allowImages: true,
  },
  {
    slug: "hacker-news",
    name: "Hacker News",
    websiteUrl: "https://news.ycombinator.com",
    feedUrl: "https://hacker-news.firebaseio.com/v0/topstories.json",
    color: "#f68b28",
    adapter: "hn",
    sourceKind: "AGGREGATOR" as const,
  },
  {
    slug: "gnews",
    name: "GNews",
    websiteUrl: "https://gnews.io",
    feedUrl: "https://gnews.io/api/v4/top-headlines",
    color: "#4a78bb",
    adapter: "gnews",
    sourceKind: "AGGREGATOR" as const,
    minPollMinutes: 60,
    enabled: !!process.env.GNEWS_API_KEY,
  },
  ...BANGLADESH_SOURCES,
];
