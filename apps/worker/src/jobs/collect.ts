import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { db, SOURCE_CATALOG } from "@techpulse/db";
import { CATEGORIES, BD_CATEGORIES } from "@techpulse/shared";
import { adapters } from "../adapters/index.js";
import { normalizeArticle } from "../processors/article.js";
import { ingestArticle, refreshRankings } from "../processors/ingest.js";
import { mapBounded, HttpError } from "../utils/http.js";
import pino from "pino";
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
export async function ensureCatalog() {
  for (const [alias, name, shortName] of BD_CATEGORIES)
    await db.category.upsert({
      where: { slug: `bd-${alias}` },
      update: { name, shortName, scope: "BANGLADESH" },
      create: { slug: `bd-${alias}`, name, shortName, scope: "BANGLADESH" },
    });
  for (const [slug, name, shortName] of CATEGORIES)
    await db.category.upsert({
      where: { slug },
      update: { name, shortName },
      create: { slug, name, shortName },
    });
  for (const source of SOURCE_CATALOG)
    await db.newsSource.upsert({
      where: { slug: source.slug },
      update: {},
      create: source,
    });
}
export async function collectAll({
  force = false,
  onlySources,
}: { force?: boolean; onlySources?: string[] } = {}) {
  const owner = randomUUID();
  const lease = await db.$queryRaw<
    { owner: string }[]
  >`INSERT INTO "WorkerLease" (id,owner,"expiresAt") VALUES ('collection',${owner},NOW()+INTERVAL '120 seconds') ON CONFLICT (id) DO UPDATE SET owner=EXCLUDED.owner,"expiresAt"=EXCLUDED."expiresAt" WHERE "WorkerLease"."expiresAt"<NOW() RETURNING owner`;
  if (!lease.length) {
    logger.info("Collection already running in another worker");
    return { skipped: true };
  }
  let jobId: string | undefined;
  let leaseLost = false;
  const heartbeat = setInterval(async () => {
    try {
      const updated = await db.workerLease.updateMany({
        where: { id: "collection", owner },
        data: { expiresAt: new Date(Date.now() + 120000) },
      });
      if (!updated.count) leaseLost = true;
      if (jobId)
        await db.collectionJob.update({
          where: { id: jobId },
          data: { heartbeatAt: new Date() },
        });
    } catch {
      leaseLost = true;
      logger.error("Worker heartbeat failed");
    }
  }, 15000);
  try {
    await ensureCatalog();
    await db.collectionJob.updateMany({
      where: {
        status: "running",
        heartbeatAt: { lt: new Date(Date.now() - 120000) },
      },
      data: {
        status: "interrupted",
        finishedAt: new Date(),
        error: "Previous worker stopped before completion",
      },
    });
    const job = await db.collectionJob.create({ data: {} });
    jobId = job.id;
    const sources = await db.newsSource.findMany({
      where: {
        enabled: true,
        ...(onlySources ? { slug: { in: onlySources } } : {}),
        ...(!force
          ? {
              OR: [
                { nextPollAt: null },
                { nextPollAt: { lte: new Date(Date.now() + 60000) } },
              ],
            }
          : {}),
      },
    });
    const results = await mapBounded(
      sources,
      Math.min(8, Math.max(1, Number(process.env.COLLECTION_CONCURRENCY || 3))),
      async (source) => {
        // A short lookahead avoids skipping an entire cron cycle when a feed's
        // minimum interval ends seconds after the scheduler's minute boundary.
        if (!force && source.nextPollAt)
          await delay(Math.max(0, source.nextPollAt.getTime() - Date.now()));
        const started = Date.now();
        let received = 0,
          inserted = 0,
          updated = 0,
          rejected = 0;
        let regionalAccepted = 0,
          regionalRejected = 0,
          regionalReview = 0;
        const log = await db.collectionLog.create({
          data: { sourceId: source.id, jobId: job.id, status: "running" },
        });
        await db.newsSource.update({
          where: { id: source.id },
          data: { lastAttemptAt: new Date() },
        });
        try {
          if (leaseLost) throw new Error("Worker lease lost");
          if (source.slug.startsWith("gnews")) {
            const day = new Date();
            day.setUTCHours(0, 0, 0, 0);
            const attempts = await db.collectionLog.count({
              where: {
                source: { slug: { startsWith: "gnews" } },
                startedAt: { gte: day },
              },
            });
            if (attempts > Number(process.env.GNEWS_DAILY_REQUEST_LIMIT || 24))
              throw new HttpError(
                429,
                86400 - (Date.now() - day.getTime()) / 1000,
              );
          }
          const adapter = adapters[source.slug];
          if (!adapter) throw new Error("No adapter registered for source");
          const result = await adapter.collect(source);
          received = result.articles.length;
          rejected = result.warnings || 0;
          for (const raw of result.articles) {
            if (leaseLost) throw new Error("Worker lease lost");
            let normalized;
            try {
              normalized = normalizeArticle(raw, source);
            } catch {
              rejected++;
              continue;
            }
            if (source.scope === "BANGLADESH") {
              if (normalized.classificationStatus === "ACCEPTED")
                regionalAccepted++;
              else if (normalized.classificationStatus === "REJECTED")
                regionalRejected++;
              else regionalReview++;
            }
            try {
              const record = await ingestArticle(source.id, normalized, owner);
              if (record.inserted) inserted++;
              else updated++;
            } catch (error) {
              if (
                error instanceof Error &&
                error.message === "Worker lease lost"
              )
                throw error;
              if ((error as { code?: string }).code === "P2002") {
                rejected++;
                continue;
              }
              throw error;
            }
          }
          const completed = new Date();
          await db.newsSource.update({
            where: { id: source.id },
            data: {
              lastSuccessAt: completed,
              lastError: null,
              nextPollAt: new Date(
                Math.max(
                  started + source.minPollMinutes * 60000,
                  Date.now() + (result.cacheSeconds || 0) * 1000,
                ),
              ),
              etag: result.etag ?? source.etag,
              lastModified: result.lastModified ?? source.lastModified,
            },
          });
          const status = result.notModified
            ? "not_modified"
            : rejected
              ? "partial"
              : "success";
          await db.collectionLog.update({
            where: { id: log.id },
            data: {
              status,
              received,
              inserted,
              updated,
              rejected,
              regionalAccepted,
              regionalRejected,
              regionalReview,
              finishedAt: completed,
              durationMs: Date.now() - started,
            },
          });
          logger.info(
            {
              source: source.slug,
              status,
              received,
              inserted,
              updated,
              rejected,
              regionalAccepted,
              regionalRejected,
              regionalReview,
            },
            "Source collected",
          );
          return true;
        } catch (error) {
          const message =
            error instanceof HttpError
              ? error.message
              : error instanceof Error &&
                  /Malformed|Unsupported|lease lost|adapter|credential|Invalid/.test(
                    error.message,
                  )
                ? error.message
                : "Source request or processing failed";
          const backoff = Math.max(
            source.minPollMinutes * 60,
            error instanceof HttpError ? (error.retryAfter ?? 0) : 0,
          );
          await db.newsSource.update({
            where: { id: source.id },
            data: {
              lastError: message,
              nextPollAt: new Date(Date.now() + backoff * 1000),
            },
          });
          await db.collectionLog.update({
            where: { id: log.id },
            data: {
              status: "failed",
              received,
              inserted,
              updated,
              rejected,
              message,
              finishedAt: new Date(),
              durationMs: Date.now() - started,
            },
          });
          logger.warn({ source: source.slug, message }, "Source failed");
          return false;
        }
      },
    );
    if (leaseLost) throw new Error("Worker lease lost");
    await refreshRankings();
    const status = results.every(Boolean)
      ? "success"
      : results.some(Boolean)
        ? "partial"
        : "failed";
    await db.collectionJob.update({
      where: { id: job.id },
      data: { status, finishedAt: new Date() },
    });
    logger.info(
      { jobId: job.id, status, sources: results.length },
      "Collection completed",
    );
    return { skipped: false, status };
  } catch (error) {
    if (jobId)
      await db.collectionJob
        .update({
          where: { id: jobId },
          data: {
            status: "failed",
            finishedAt: new Date(),
            error: "Collection job interrupted",
          },
        })
        .catch(() => {});
    throw error;
  } finally {
    clearInterval(heartbeat);
    await db.workerLease.deleteMany({ where: { id: "collection", owner } });
  }
}
