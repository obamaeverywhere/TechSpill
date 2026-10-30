import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseFeed } from "../apps/worker/src/adapters/rss";
import { normalizeHackerNews } from "../apps/worker/src/adapters/hacker-news";
import {
  categorize,
  canonicalize,
  normalizeArticle,
  plainText,
  titleSimilarity,
} from "../apps/worker/src/processors/article";
import { trendingScore } from "../apps/worker/src/processors/ingest";
import {
  assertAllowed,
  fetchSource,
  mapBounded,
  HttpError,
} from "../apps/worker/src/utils/http";
import { newsQuerySchema } from "@techpulse/shared";
const rss = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><language>en-US</language><item><title>OpenAI &amp; developers</title><link>https://example.com/story?utm_source=rss</link><guid>stable-id</guid><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>New software APIs for developers</p><img src="https://example.com/photo.jpg"/>]]></description><media:thumbnail url="https://example.com/thumbnail.jpg"/></item></channel></rss>`;
const policy = { allowExcerpts: true, allowImages: true };
beforeEach(() => {
  process.env.FETCH_RETRIES = "0";
});
describe("feed parsing and normalization", () => {
  it("reads RSS metadata, decodes entities, and uses a supplied thumbnail", () => {
    const raw = parseFeed(rss);
    expect(raw).toHaveLength(1);
    const a = normalizeArticle(raw[0], policy);
    expect(a.title).toBe("OpenAI & developers");
    expect(a.externalId).toBe("stable-id");
    expect(a.language).toBe("en");
    expect(a.description).toBe("New software APIs for developers");
    expect(a.imageUrl).toBe("https://example.com/thumbnail.jpg");
    expect(a.categories).toContain("software-development");
  });
  it("parses Atom links and ISO timestamps, even with a single entry", () => {
    const raw = parseFeed(
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>tag:fixture,1</id><title>Fixture hardware</title><link rel="self" href="https://example.com/feed/1"/><link rel="alternate" href="https://example.com/1"/><updated>2026-10-20T08:00:00Z</updated><author><name>Test author</name></author></entry></feed>',
    );
    expect(normalizeArticle(raw[0], policy).originalUrl).toBe(
      "https://example.com/1",
    );
    expect(normalizeArticle(raw[0], policy).author).toBe("Test author");
  });
  it("rejects broken XML and entity declarations", () => {
    expect(() => parseFeed("<rss><channel>")).toThrow();
    expect(() =>
      parseFeed(
        '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      ),
    ).toThrow();
  });
  it("rejects missing/invalid/future publication times without inventing a date", () => {
    const raw = parseFeed(rss)[0];
    for (const publishedAt of ["", "invalid", "2099-01-01"])
      expect(() => normalizeArticle({ ...raw, publishedAt }, policy)).toThrow();
  });
  it("omits unlicensed excerpts and handles missing images and descriptions", () => {
    const a = normalizeArticle(
      {
        title: "Fixture hardware story",
        url: "https://example.com/1",
        publishedAt: "2026-10-20",
      },
      { allowExcerpts: false, allowImages: false },
    );
    expect(a.description).toBeNull();
    expect(a.imageUrl).toBeNull();
    expect(a.region).toBeNull();
    expect(a.externalId).toHaveLength(64);
  });
  it("normalizes official Hacker News scores and Unix timestamps; skips deleted items", () => {
    const raw = normalizeHackerNews({
      id: 12,
      type: "story",
      title: "Fixture story",
      time: 1600000000,
      score: 42,
      by: "test",
    });
    expect(raw?.hnScore).toBe(42);
    expect(raw?.publishedAt).toEqual(new Date(1600000000000));
    expect(raw?.url).toBe("https://news.ycombinator.com/item?id=12");
    expect(normalizeHackerNews({ deleted: true })).toBeNull();
  });
  it("strips HTML and encoded HTML rather than rendering external markup", () => {
    expect(plainText("<script>alert(1)</script><p>Safe &amp; sound</p>")).toBe(
      "Safe & sound",
    );
    expect(plainText("&lt;p&gt;Safe &amp; sound&lt;/p&gt;")).toBe(
      "Safe & sound",
    );
  });
});
describe("classification, canonicalization and ranking", () => {
  it("uses richer metadata to assign multiple configurable categories", () => {
    expect(
      categorize(
        "A fixture company announcement",
        "The robotics startup raises venture capital funding",
      ),
    ).toEqual(expect.arrayContaining(["robotics", "startups"]));
    expect(categorize("Custom", "metadata", { custom: /metadata/ })).toEqual([
      "custom",
    ]);
  });
  it("does not invent a language or category for sparse metadata", () => {
    const article = normalizeArticle(
      {
        title: "Fixture short story",
        url: "https://example.com",
        publishedAt: "2026-10-20",
      },
      policy,
    );
    expect(article.language).toBeNull();
    expect(article.categories).toEqual([]);
  });
  it("removes tracking, fragments, and trailing slashes without dropping article query IDs", () => {
    expect(
      canonicalize("https://www.Example.com/story/?utm_source=rss&id=7#top"),
    ).toBe("https://example.com/story?id=7");
  });
  it("blocks unsafe and private article links", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://127.0.0.1/admin",
      "http://192.168.0.2",
      "https://user:pass@example.com",
    ])
      expect(() => canonicalize(url)).toThrow();
  });
  it("ranks newer stories higher and adds only observed coverage and engagement", () => {
    const now = Date.now();
    expect(trendingScore(new Date(now), 1, null, now)).toBeGreaterThan(
      trendingScore(new Date(now - 86400000), 1, null, now),
    );
    expect(trendingScore(new Date(now), 3, 100, now)).toBeGreaterThan(
      trendingScore(new Date(now), 1, null, now),
    );
  });
  it("keeps unrelated reporting out of a story cluster", () => {
    expect(
      titleSimilarity(
        "Company launches new quantum computing processor",
        "Company launches new quantum computing processor today",
      ),
    ).toBeGreaterThan(0.74);
    expect(
      titleSimilarity(
        "Apple earnings rise in the third quarter",
        "Google releases a new cloud database",
      ),
    ).toBeLessThan(0.3);
  });
});
describe("upstream protections", () => {
  it("allows fixed source hosts and rejects redirects to untrusted hosts", async () => {
    assertAllowed("https://techcrunch.com/feed/");
    expect(() => assertAllowed("https://techcrunch.com.evil.test")).toThrow();
    const fake = vi.fn().mockResolvedValue(
      new Response("", {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    );
    await expect(
      fetchSource("https://techcrunch.com/feed/", {}, fake),
    ).rejects.toThrow("Blocked");
    expect(fake).toHaveBeenCalledTimes(1);
  });
  it("returns a 304 without parsing a feed and forwards caching headers", async () => {
    const fake = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 304, headers: { etag: '"abc"' } }),
      );
    const response = await fetchSource(
      "https://techcrunch.com/feed/",
      { "If-None-Match": '"abc"' },
      fake,
    );
    expect(response.status).toBe(304);
    expect(fake.mock.calls[0][1].headers["If-None-Match"]).toBe('"abc"');
  });
  it("reports source failure and respects Retry-After", async () => {
    const fake = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "retry-after": "600" } }),
      );
    await expect(
      fetchSource("https://techcrunch.com/feed/", {}, fake),
    ).rejects.toMatchObject({ status: 429, retryAfter: 600 });
  });
  it("retries transient errors and respects feed cache duration", async () => {
    process.env.FETCH_RETRIES = "1";
    const fake = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response("<rss/>", {
          headers: { "cache-control": "max-age=3600", age: "10" },
        }),
      );
    const result = await fetchSource("https://techcrunch.com/feed/", {}, fake);
    expect(fake).toHaveBeenCalledTimes(2);
    expect(result.cacheSeconds).toBe(3590);
  });
  it("limits concurrent fetches", async () => {
    let active = 0,
      max = 0;
    await mapBounded([1, 2, 3, 4, 5, 6], 2, async () => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(max).toBe(2);
  });
  it("validates pagination and filter ranges", () => {
    for (const value of [
      { page: 0 },
      { limit: 200 },
      { sort: "views" },
      { unknown: "x" },
      { from: "not-a-date" },
      { from: "2026-10-20T00:00:00Z", to: "2026-10-10T00:00:00Z" },
    ])
      expect(newsQuerySchema.safeParse(value).success).toBe(false);
  });
});
