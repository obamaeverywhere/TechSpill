import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { db } from "@techpulse/db";
import { createApp } from "../apps/api/src/app";
import { normalizeArticle } from "../apps/worker/src/processors/article";
import {
  ingestArticle,
  refreshRankings,
} from "../apps/worker/src/processors/ingest";
import { collectAll, ensureCatalog } from "../apps/worker/src/jobs/collect";
import { adapters } from "../apps/worker/src/adapters";
const enabled = process.env.RUN_DB_TESTS === "1";
describe.skipIf(!enabled)("PostgreSQL ingestion and API integration", () => {
  let sourceId: string;
  const token = randomUUID();
  const slug = `test-${token}`;
  const app = createApp();
  let ids: string[] = [];
  beforeAll(async () => {
    await ensureCatalog();
    const source = await db.newsSource.create({
      data: {
        slug,
        name: "Integration fixture",
        websiteUrl: "https://example.com",
        feedUrl: "https://example.com/feed",
        color: "#123456",
        enabled: false,
      },
    });
    sourceId = source.id;
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    delete adapters[slug];
    await db.collectionLog.deleteMany({ where: { sourceId } });
    const clusters = await db.article.findMany({
      where: { sourceId },
      select: { storyClusterId: true },
    });
    await db.newsSource.delete({ where: { id: sourceId } });
    await db.storyCluster.deleteMany({
      where: {
        id: { in: clusters.map((a) => a.storyClusterId) },
        articles: { none: {} },
      },
    });
    await db.$disconnect();
  });
  const fixture = (n: number) =>
    normalizeArticle(
      {
        externalId: `fixture-${n}`,
        title: `${token} software fixture number ${n}`,
        url: `https://example.com/${token}/${n}`,
        description: "A fixture about programming and software development.",
        publishedAt: new Date(Date.now() - (n + 1) * 3600000),
        language: "en",
      },
      { allowExcerpts: true, allowImages: false },
    );
  it("repeated ingestion updates the same row without creating duplicates", async () => {
    const first = await ingestArticle(sourceId, fixture(0));
    const second = await ingestArticle(sourceId, {
      ...fixture(0),
      description: "Updated permitted excerpt",
    });
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.id).toBe(first.id);
    expect(await db.article.count({ where: { sourceId } })).toBe(1);
    expect(
      (await db.article.findUnique({ where: { id: first.id } }))?.description,
    ).toBe("Updated permitted excerpt");
    ids.push(first.id);
  });
  it("deduplicates URL tracking variants and enforces uniqueness at database level", async () => {
    const a = fixture(0);
    const duplicate = await ingestArticle(sourceId, {
      ...a,
      externalId: "different-guid",
      originalUrl: `${a.originalUrl}?utm_source=test`,
    });
    expect(duplicate.inserted).toBe(false);
    expect(await db.article.count({ where: { sourceId } })).toBe(1);
  });
  it("rejects invalid article data before persistence", async () => {
    await expect(
      ingestArticle(sourceId, { ...fixture(1), title: "" }),
    ).rejects.toThrow();
    expect(await db.article.count({ where: { sourceId } })).toBe(1);
  });
  it("combines search, source, category, language, dates, sorting and pagination", async () => {
    for (let n = 1; n < 5; n++)
      ids.push((await ingestArticle(sourceId, fixture(n))).id);
    await refreshRankings();
    const response = await request(app)
      .get("/api/news")
      .query({
        q: token,
        source: slug,
        category: "software-development",
        language: "en",
        from: new Date(Date.now() - 86400000).toISOString(),
        limit: 2,
        page: 1,
      });
    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({
      total: 5,
      totalPages: 3,
      page: 1,
    });
    expect(response.body.data).toHaveLength(2);
    expect(
      new Date(response.body.data[0].publishedAt).getTime(),
    ).toBeGreaterThan(new Date(response.body.data[1].publishedAt).getTime());
    const page2 = await request(app)
      .get("/api/search")
      .query({ q: token, source: slug, limit: 2, page: 2 });
    expect(page2.body.data.map((a: any) => a.id)).not.toContain(
      response.body.data[0].id,
    );
    expect(
      (
        await request(app)
          .get("/api/news")
          .query({ q: token, category: "gaming" })
      ).body.meta.total,
    ).toBe(0);
    expect(
      (await request(app).get("/api/news").query({ ids: "" })).body.data,
    ).toEqual([]);
  });
  it("preserves independent attribution for the same event", async () => {
    const second = await db.newsSource.create({
      data: {
        slug: `${slug}-second`,
        name: "Second fixture",
        websiteUrl: "https://example.org",
        feedUrl: "https://example.org/feed",
        color: "#123456",
        enabled: false,
      },
    });
    try {
      const a = await ingestArticle(second.id, fixture(0));
      expect(a.id).not.toBe(ids[0]);
      const row = await db.article.findUniqueOrThrow({ where: { id: ids[0] } });
      expect(
        (await db.article.findUniqueOrThrow({ where: { id: a.id } }))
          .storyClusterId,
      ).toBe(row.storyClusterId);
    } finally {
      await db.newsSource.delete({ where: { id: second.id } });
    }
  });
  it("records a failed source and releases the collection lease without crashing", async () => {
    await db.newsSource.update({
      where: { id: sourceId },
      data: { enabled: true },
    });
    adapters[slug] = {
      collect: async () => {
        throw new Error("simulated outage");
      },
    };
    const result = await collectAll({ force: true, onlySources: [slug] });
    await db.newsSource.update({
      where: { id: sourceId },
      data: { enabled: false },
    });
    expect(result).toMatchObject({ status: "failed" });
    expect(
      (await db.newsSource.findUniqueOrThrow({ where: { id: sourceId } }))
        .lastError,
    ).toBeTruthy();
    expect(
      await db.workerLease.findUnique({ where: { id: "collection" } }),
    ).toBeNull();
    const log = await db.collectionLog.findFirst({
      where: { sourceId },
      orderBy: { startedAt: "desc" },
    });
    expect(log?.status).toBe("failed");
  });
  it("waits for a near-boundary polling restriction instead of skipping a cron cycle or polling early", async () => {
    const eligibleAt = new Date(Date.now() + 250);
    await db.newsSource.update({
      where: { id: sourceId },
      data: { enabled: true, nextPollAt: eligibleAt },
    });
    let requestedAt = 0;
    adapters[slug] = {
      collect: async () => {
        requestedAt = Date.now();
        return { articles: [] };
      },
    };
    try {
      expect(await collectAll({ onlySources: [slug] })).toMatchObject({
        status: "success",
      });
      expect(requestedAt).toBeGreaterThanOrEqual(eligibleAt.getTime());
      expect(requestedAt).toBeLessThan(eligibleAt.getTime() + 5000);
    } finally {
      await db.newsSource.update({
        where: { id: sourceId },
        data: { enabled: false },
      });
    }
  });
  it("prevents a second worker from starting during an active lease", async () => {
    await db.workerLease.create({
      data: {
        id: "collection",
        owner: "integration-test",
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    try {
      expect(await collectAll()).toEqual({ skipped: true });
    } finally {
      await db.workerLease.deleteMany({ where: { owner: "integration-test" } });
    }
  });
  it("exposes article detail and metadata endpoints without private source config", async () => {
    const detail = await request(app).get(`/api/news/${ids[0]}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.source.slug).toBe(slug);
    const sources = await request(app).get("/api/sources");
    expect(
      sources.body.data.find((s: any) => s.id === sourceId),
    ).not.toHaveProperty("feedUrl");
    expect((await request(app).get("/api/categories")).status).toBe(200);
    expect((await request(app).get("/api/health")).body.data.database).toBe(
      "connected",
    );
  });
});
