import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { db } from "@techpulse/db";
import { createApp } from "../apps/api/src/app";
import { ensureCatalog, collectAll } from "../apps/worker/src/jobs/collect";
import { adapters } from "../apps/worker/src/adapters";
import { normalizeArticle } from "../apps/worker/src/processors/article";
import {
  ingestArticle,
  refreshRankings,
} from "../apps/worker/src/processors/ingest";
import { reviewBangladeshArticle } from "../apps/worker/src/processors/regional-review";
const enabled = process.env.RUN_DB_TESTS === "1";
describe.skipIf(!enabled)("Bangladesh API and ingestion integration", () => {
  const token = randomUUID(),
    slug = `bd-fixture-${token}`,
    globalSlug = `global-fixture-${token}`;
  const app = createApp();
  let sourceId: string, globalId: string;
  const ids: string[] = [];
  const titleList = [
    `Bangladeshi startup launches AI software platform ${token}`,
    `বাংলাদেশে নতুন স্মার্টফোন চালু হয়েছে ${token}`,
    `Apple launches iPhone worldwide ${token}`,
    `AI in Bangladesh ${token}`,
    `Bangladesh wins a cricket match ${token}`,
  ];
  const raw = (index: number) => ({
    externalId: `bd-fixture-${index}`,
    title: titleList[index],
    url: `https://example.com/${token}/${index}`,
    publishedAt: new Date(Date.now() - (index + 1) * 3600000),
    language: index === 1 ? "bn" : "en",
  });
  beforeAll(async () => {
    await ensureCatalog();
    const source = await db.newsSource.create({
      data: {
        slug,
        name: "Bangladesh integration fixture",
        websiteUrl: "https://example.com",
        feedUrl: "https://example.com/feed",
        scope: "BANGLADESH",
        enabled: false,
        color: "#117755",
      },
    });
    sourceId = source.id;
    const global = await db.newsSource.create({
      data: {
        slug: globalSlug,
        name: "Global integration fixture",
        websiteUrl: "https://example.org",
        feedUrl: "https://example.org/feed",
        enabled: false,
        color: "#117755",
      },
    });
    globalId = global.id;
    for (let n = 0; n < titleList.length; n++)
      ids.push(
        (
          await ingestArticle(
            sourceId,
            normalizeArticle(raw(n), {
              allowImages: false,
              allowExcerpts: false,
            }),
          )
        ).id,
      );
    ids.push(
      (
        await ingestArticle(
          globalId,
          normalizeArticle(
            {
              externalId: "international-partnership",
              title: `Google partners with Bangladeshi universities for AI training ${token}`,
              url: `https://example.org/${token}/partnership`,
              publishedAt: new Date(Date.now() - 6 * 3600000),
              language: "en",
            },
            { allowImages: false, allowExcerpts: false },
          ),
        )
      ).id,
    );
    ids.push(
      (
        await ingestArticle(
          globalId,
          normalizeArticle(
            {
              ...raw(2),
              externalId: "global-iphone",
              url: `https://example.org/${token}/global`,
            },
            { allowImages: false, allowExcerpts: false },
          ),
        )
      ).id,
    );
    await refreshRankings();
  });
  afterAll(async () => {
    const rows = await db.article.findMany({
      where: { sourceId: { in: [sourceId, globalId] } },
      select: { storyClusterId: true },
    });
    await db.newsSource.deleteMany({
      where: { id: { in: [sourceId, globalId] } },
    });
    await db.storyCluster.deleteMany({
      where: {
        id: { in: rows.map((r) => r.storyClusterId) },
        articles: { none: {} },
      },
    });
    await db.$disconnect();
  });
  it("serves only accepted Bangladesh technology and permits regional/global overlap", async () => {
    const res = await request(app)
      .get("/api/news/bangladesh")
      .query({ search: token, limit: 20 });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    expect(
      res.body.data.every(
        (a: any) =>
          a.classificationStatus === "ACCEPTED" &&
          a.countryCodes.includes("BD"),
      ),
    ).toBe(true);
    expect(res.body.data.some((a: any) => a.source.slug === globalSlug)).toBe(
      true,
    );
  });
  it("preserves newest sorting and paginates without repeating an article", async () => {
    const first = await request(app)
      .get("/api/news/bangladesh/latest")
      .query({ search: token, limit: 1, page: 1 });
    const next = await request(app)
      .get("/api/news/bangladesh/latest")
      .query({ search: token, limit: 1, page: 2 });
    expect(first.body.meta).toMatchObject({ total: 3, totalPages: 3 });
    expect(first.body.data[0].id).not.toBe(next.body.data[0].id);
    expect(Date.parse(first.body.data[0].publishedAt)).toBeGreaterThan(
      Date.parse(next.body.data[0].publishedAt),
    );
  });
  it("combines Bengali search, category, source, language and date bounds", async () => {
    const res = await request(app)
      .get("/api/news/bangladesh")
      .query({
        search: "স্মার্টফোন",
        category: "gadgets",
        source: slug,
        language: "bn",
        dateFrom: new Date(Date.now() - 86400000).toISOString(),
        limit: 5,
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe(titleList[1]);
    expect(res.body.data[0].language).toBe("bn");
    expect(
      (
        await request(app).get("/api/news/bangladesh").query({
          search: token,
          category: "ai",
          language: "en",
          source: slug,
        })
      ).body.meta.total,
    ).toBe(1);
  });
  it("does not publish review candidates through detail, global feed, or bookmarks", async () => {
    expect((await request(app).get(`/api/news/${ids[3]}`)).status).toBe(404);
    const response = await request(app)
      .get("/api/news")
      .query({ ids: ids.slice(0, 5).join(",") });
    expect(response.body.data.map((a: any) => a.id).sort()).toEqual(
      ids.slice(0, 2).sort(),
    );
  });
  it("keeps unrelated international technology accessible in the existing global feed", async () => {
    const response = await request(app)
      .get("/api/news")
      .query({ q: token, source: globalSlug });
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(2);
    expect(response.body.data.some((a: any) => a.id === ids[6])).toBe(true);
    expect(
      (await request(app).get("/api/categories")).body.data.every(
        (c: any) => !c.slug.startsWith("bd-"),
      ),
    ).toBe(true);
  });
  it("deduplicates repeated regional ingestion without changing the bookmark ID", async () => {
    const repeat = await ingestArticle(
      sourceId,
      normalizeArticle(raw(0), { allowImages: false, allowExcerpts: false }),
    );
    expect(repeat.inserted).toBe(false);
    expect(repeat.id).toBe(ids[0]);
    expect(await db.article.count({ where: { sourceId } })).toBe(5);
  });
  it("registers category/source routes before the dynamic article ID route", async () => {
    const cats = await request(app).get("/api/news/bangladesh/categories");
    expect(cats.status).toBe(200);
    expect(cats.body.data.some((c: any) => c.slug === "fintech")).toBe(true);
    const sources = await request(app).get("/api/news/bangladesh/sources");
    expect(sources.status).toBe(200);
    expect(
      sources.body.data.some(
        (s: any) => s.slug === "ict-division" && !s.enabled,
      ),
    ).toBe(true);
    expect(sources.body.data.every((s: any) => !("feedUrl" in s))).toBe(true);
    expect(
      (
        await request(app)
          .get("/api/news/bangladesh/trending")
          .query({ search: token })
      ).status,
    ).toBe(200);
  });
  it.each([
    { page: 0 },
    { limit: 51 },
    { category: "big-tech" },
    { language: "xx" },
    { dateFrom: "not-a-date" },
    { classificationStatus: "NEEDS_REVIEW" },
  ])("validates regional API inputs: %s", async (query) =>
    expect(
      (await request(app).get("/api/news/bangladesh").query(query)).status,
    ).toBe(400),
  );
  it("preserves manual acceptance and category corrections on re-ingestion", async () => {
    await reviewBangladeshArticle(
      ids[3],
      "ACCEPTED",
      "Fixture review confirms a specific local AI initiative.",
      ["ai"],
    );
    await ingestArticle(
      sourceId,
      normalizeArticle(raw(3), { allowImages: false, allowExcerpts: false }),
    );
    const row = await db.article.findUniqueOrThrow({
      where: { id: ids[3] },
      include: { categories: { include: { category: true } } },
    });
    expect(row.classificationStatus).toBe("ACCEPTED");
    expect(row.classificationLocked).toBe(true);
    expect(row.categories.some((c) => c.category.slug === "bd-ai")).toBe(true);
  });
  it("records a Bangladesh source outage without publishing substitute content", async () => {
    await db.newsSource.update({
      where: { id: sourceId },
      data: { enabled: true },
    });
    adapters[slug] = {
      collect: async () => {
        throw new Error("Simulated regional outage");
      },
    };
    const before = await db.article.count({ where: { sourceId } });
    try {
      expect(
        await collectAll({ onlySources: [slug], force: true }),
      ).toMatchObject({ status: "failed" });
      expect(await db.article.count({ where: { sourceId } })).toBe(before);
      expect(
        (await db.newsSource.findUniqueOrThrow({ where: { id: sourceId } }))
          .lastError,
      ).toBeTruthy();
    } finally {
      delete adapters[slug];
      await db.newsSource.update({
        where: { id: sourceId },
        data: { enabled: false },
      });
    }
  });
  it("supports explicit regional exclusion without inventing a replacement story", async () => {
    await reviewBangladeshArticle(
      ids[0],
      "REJECTED",
      "Fixture review identifies insufficient Bangladesh relevance.",
    );
    expect(
      (
        await request(app)
          .get("/api/news/bangladesh")
          .query({ source: slug, search: token, limit: 49 })
      ).body.data.some((a: any) => a.id === ids[0]),
    ).toBe(false);
  });
});
