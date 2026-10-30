import { describe, it, expect, vi } from "vitest";
import { fetchSource } from "../apps/worker/src/utils/http";
import { classifyBangladesh } from "../apps/worker/src/processors/bangladesh";
import {
  normalizeArticle,
  titleTokens,
} from "../apps/worker/src/processors/article";
import { parseFeed } from "../apps/worker/src/adapters/rss";
import { bangladeshTrendingScore } from "../apps/worker/src/processors/ingest";
import { bangladeshNewsQuerySchema } from "@techpulse/shared";
import { BANGLADESH_SOURCES } from "@techpulse/db";
const classify = (title: string, description = "") =>
  classifyBangladesh({ title, description });
describe("Bangladesh relevance: separate technology and local-impact gates", () => {
  it.each([
    "Apple's New iPhone Officially Launches in Bangladesh",
    "Bangladeshi Startup Raises $5 Million in Funding",
    "Google Partners With Bangladeshi Universities for AI Training",
    "Dhaka hosts a robotics hackathon for university students",
    "BTRC approves a new 5G spectrum auction",
    "বাংলাদেশে নতুন কৃত্রিম বুদ্ধিমত্তা প্রশিক্ষণ চালু করেছে বিশ্ববিদ্যালয়",
    "বাংলাদেশে ডিজিটাল পেমেন্ট সেবা চালু করেছে নতুন প্রতিষ্ঠান",
    "গ্রামীণফোন নতুন ফাইভজি নেটওয়ার্ক চালু করেছে",
  ])("accepts an evidenced technology development: %s", (title) => {
    const result = classify(title);
    expect(result.classificationStatus).toBe("ACCEPTED");
    expect(result.countryCodes).toContain("BD");
    expect(result.technologyRelevanceScore).toBeGreaterThanOrEqual(70);
    expect(result.bangladeshRelevanceScore).toBeGreaterThanOrEqual(85);
    expect(result.classificationReason).toContain("Development signal");
  });
  it.each([
    "Apple Releases New iPhone Worldwide",
    "Google Announces a New AI Model",
    "বাংলাদেশ ক্রিকেট দল নতুন সিরিজ জিতেছে",
    "Bangladeshi bakery startup raises funds for a restaurant",
    "বাংলাদেশে কৃষির বিকাশে নগদ বিনিয়োগ ঘোষণা",
    "বাংলাদেশে এআইইউবি বিশ্ববিদ্যালয় সাধারণ ইতিহাস গবেষণা চালু করেছে",
  ])("rejects global or non-technology coverage: %s", (title) =>
    expect(classify(title).classificationStatus).toBe("REJECTED"),
  );
  it("does not accept an international product because the newspaper is Bangladeshi", () => {
    const article = normalizeArticle(
      {
        title: "Google Announces a New AI Model",
        url: "https://www.thedailystar.net/fixture-global-ai",
        publishedAt: "2026-10-20",
        language: "en",
      },
      { allowImages: false, allowExcerpts: false },
    );
    expect(article.classificationStatus).toBe("REJECTED");
    expect(article.countryCodes).not.toContain("BD");
  });
  it("requires review when geography and technology have no evidenced development", () => {
    expect(classify("AI in Bangladesh").classificationStatus).toBe(
      "NEEDS_REVIEW",
    );
    expect(
      classify(
        "An AI model launches globally",
        "Bangladesh wins a cricket match.",
      ).classificationStatus,
    ).not.toBe("ACCEPTED");
  });
  it("uses richer feed metadata rather than the headline alone", () => {
    const result = classify(
      "A new training partnership",
      "Google partners with universities in Bangladesh to launch artificial intelligence training.",
    );
    expect(result.classificationStatus).toBe("ACCEPTED");
    expect(result.classificationReason).toContain("feed metadata");
  });
  it("does not infer a country from an ambiguous domestic phrase", () => {
    expect(
      classify("দেশে নতুন স্মার্টফোন চালু হয়েছে").classificationStatus,
    ).toBe("NEEDS_REVIEW");
  });
  it("assigns multiple regional categories", () => {
    expect(
      classify(
        "Bangladeshi startup launches AI software after a new funding round",
      ).categories,
    ).toEqual(
      expect.arrayContaining([
        "bd-startups",
        "bd-ai",
        "bd-software",
        "bd-investments",
      ]),
    );
  });
});
describe("Bengali metadata, source attribution and API boundaries", () => {
  it("can disable hidden HTTP retries for a quota-counted licensed request", async () => {
    vi.stubEnv("FETCH_RETRIES", "2");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 503 }));
    try {
      await expect(
        fetchSource("https://gnews.io/api/v4/search", {}, fetcher, {
          maxRetries: 0,
        }),
      ).rejects.toMatchObject({ status: 503 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("preserves Bengali combining marks when clustering headlines", () => {
    expect([...titleTokens("বাংলাদেশে প্রযুক্তির নতুন উন্নয়ন")]).toContain(
      "বাংলাদেশে",
    );
  });
  it("recognizes technology event names with intervening words", () => {
    expect(
      classify(
        "AI Automation Summit brings technology leaders together in Dhaka",
      ).categories,
    ).toContain("bd-events");
  });
  it("preserves Bengali text and detects its script without an inferred publisher location", () => {
    const title = "বাংলাদেশে নতুন সফটওয়্যার গবেষণা প্রকল্প চালু";
    const a = normalizeArticle(
      {
        title,
        url: "https://example.com/bn",
        publishedAt: "2026-10-20",
        language: "en",
      },
      { allowImages: false, allowExcerpts: false },
    );
    expect(a.title).toBe(title);
    expect(a.language).toBe("bn");
    expect(a.searchText).toContain(title.normalize("NFC").toLowerCase());
  });
  it("parses a headline nested in a publisher-provided title link", () => {
    const a = parseFeed(
      '<rss><channel><item><title><a href="/story">Fixture software launch in Bangladesh</a></title><link>https://example.com/story</link><pubDate>Wed, 28 Oct 26 15:55:34 +0600</pubDate></item></channel></rss>',
    );
    expect(a[0].title).toBe("Fixture software launch in Bangladesh");
    expect(
      normalizeArticle(a[0], {
        allowImages: false,
        allowExcerpts: false,
      }).publishedAt.toISOString(),
    ).toBe("2026-10-28T09:55:34.000Z");
  });
  it("distinguishes official announcements, press releases and disclosed branded material", () => {
    const raw = {
      title: "Bangladesh launches an AI training programme",
      url: "https://example.com/story",
      publishedAt: "2026-10-20",
    };
    const policy = { allowImages: false, allowExcerpts: false };
    expect(
      normalizeArticle(raw, { ...policy, sourceKind: "OFFICIAL" }).contentKind,
    ).toBe("OFFICIAL_ANNOUNCEMENT");
    expect(
      normalizeArticle({ ...raw, tags: ["Brand Story"] }, policy).contentKind,
    ).toBe("BRANDED_CONTENT");
    expect(
      normalizeArticle({ ...raw, tags: ["Sponsored"] }, policy).contentKind,
    ).toBe("SPONSORED");
    expect(
      normalizeArticle({ ...raw, author: "Press Release" }, policy).contentKind,
    ).toBe("PRESS_RELEASE");
  });
  it("interprets date-only filters in Bangladesh time", () => {
    const q = bangladeshNewsQuerySchema.parse({
      dateFrom: "2026-10-20",
      dateTo: "2026-10-20",
      search: "প্রযুক্তি",
      language: "bn",
    });
    expect(new Date(q.from!).toISOString()).toBe("2026-10-19T18:00:00.000Z");
    expect(new Date(q.to!).toISOString()).toBe("2026-10-20T17:59:59.999Z");
    expect(q.q).toBe("প্রযুক্তি");
  });
  it.each([
    { category: "global" },
    { language: "xx" },
    { page: 0 },
    { dateFrom: "2026-02-31" },
    { dateFrom: "2026-10-25", dateTo: "2026-10-20" },
    { classificationStatus: "REJECTED" },
  ])("rejects invalid or unsafe filter overrides: %s", (query) =>
    expect(bangladeshNewsQuerySchema.safeParse(query).success).toBe(false),
  );
  it("uses only freshness and observed publisher coverage in the regional ranking", () => {
    const now = Date.now();
    expect(bangladeshTrendingScore(new Date(now), 0, now)).toBe(70);
    expect(bangladeshTrendingScore(new Date(now), 4, now)).toBeGreaterThan(70);
    expect(
      bangladeshTrendingScore(new Date(now - 86400000), 1, now),
    ).toBeLessThan(70);
  });
  it("keeps unverified official sources and unlicensed APIs disabled", () => {
    for (const slug of ["ict-division", "btrc", "gnews-bangladesh"])
      expect(BANGLADESH_SOURCES.find((s) => s.slug === slug)?.enabled).toBe(
        false,
      );
    expect(
      BANGLADESH_SOURCES.find((s) => s.slug === "btrc")?.feedUrl,
    ).toBeNull();
    expect(
      BANGLADESH_SOURCES.every((s) => !s.allowImages && !s.allowExcerpts),
    ).toBe(true);
  });
});
