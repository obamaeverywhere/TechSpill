import { db, Prisma } from "@techpulse/db";
import { incomingArticleSchema, type IncomingArticle } from "@techpulse/shared";
import { fingerprint, titleTokens, titleSimilarity } from "./article.js";
export async function ingestArticle(
  sourceId: string,
  input: IncomingArticle,
  leaseOwner?: string,
) {
  const article = incomingArticleSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      if (leaseOwner) {
        const active = await tx.$queryRaw<
          { owner: string }[]
        >`SELECT "owner" FROM "WorkerLease" WHERE id='collection' AND "expiresAt">NOW() FOR UPDATE`;
        if (active[0]?.owner !== leaseOwner)
          throw new Error("Worker lease lost");
      }
      let existing = await tx.article.findFirst({
        where: {
          sourceId,
          OR: [
            { externalId: article.externalId },
            { canonicalUrl: article.canonicalUrl },
          ],
        },
      });
      if (existing) {
        await tx.$queryRaw`SELECT id FROM "Article" WHERE id=${existing.id} FOR UPDATE`;
        existing = await tx.article.findUniqueOrThrow({
          where: { id: existing.id },
        });
      }
      const key = fingerprint([...titleTokens(article.title)].sort().join(" "));
      let cluster = await tx.storyCluster.findUnique({
        where: { fingerprint: key },
      });
      if (!cluster) {
        const candidates = await tx.storyCluster.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 72 * 3600000) } },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
        cluster =
          candidates.find(
            (c) =>
              titleTokens(article.title).size >= 5 &&
              titleSimilarity(c.title, article.title) >= 0.74,
          ) ?? null;
      }
      cluster ??= await tx.storyCluster.upsert({
        where: { fingerprint: key },
        update: {},
        create: { fingerprint: key, title: article.title },
      });
      const { categories, tags, ...fields } = article;
      const data = { ...fields, sourceId, storyClusterId: cluster.id };
      let effectiveCategories = categories;
      if (existing?.classificationLocked) {
        Object.assign(data, {
          countryCodes: existing.countryCodes,
          technologyRelevanceScore: existing.technologyRelevanceScore,
          bangladeshRelevanceScore: existing.bangladeshRelevanceScore,
          classificationStatus: existing.classificationStatus,
          classificationReason: existing.classificationReason,
          classifiedAt: existing.classifiedAt,
          classifierVersion: existing.classifierVersion,
        });
        const currentRegional = await tx.articleCategory.findMany({
          where: { articleId: existing.id, category: { scope: "BANGLADESH" } },
          include: { category: true },
        });
        effectiveCategories = [
          ...categories.filter((c) => !c.startsWith("bd-")),
          ...currentRegional.map((c) => c.category.slug),
        ];
      } else if (existing)
        data.countryCodes = [
          ...new Set([
            ...existing.countryCodes.filter((code) => code !== "BD"),
            ...fields.countryCodes,
          ]),
        ];
      const record = existing
        ? await tx.article.update({ where: { id: existing.id }, data })
        : await tx.article.create({ data });
      await tx.articleCategory.deleteMany({ where: { articleId: record.id } });
      const categoryRows = await tx.category.findMany({
        where: { slug: { in: effectiveCategories } },
      });
      if (categoryRows.length)
        await tx.articleCategory.createMany({
          data: categoryRows.map((c) => ({
            articleId: record.id,
            categoryId: c.id,
          })),
        });
      await tx.articleTag.deleteMany({ where: { articleId: record.id } });
      for (const name of tags) {
        const tag = await tx.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        await tx.articleTag.create({
          data: { articleId: record.id, tagId: tag.id },
        });
      }
      return { id: record.id, inserted: !existing };
    },
    { timeout: 15000 },
  );
}
export function trendingScore(
  publishedAt: Date,
  sources: number,
  hnScore: number | null,
  now = Date.now(),
) {
  const age = Math.max(0, (now - publishedAt.getTime()) / 3600000);
  const freshness = Math.exp(-age / 24);
  const coverage = Math.min(1, Math.log2(Math.max(1, sources)) / 3);
  const engagement = Math.min(1, Math.log10(1 + (hnScore ?? 0)) / 3);
  const weights = [
    Number(process.env.TREND_FRESHNESS_WEIGHT ?? 60),
    Number(process.env.TREND_COVERAGE_WEIGHT ?? 25),
    Number(process.env.TREND_ENGAGEMENT_WEIGHT ?? 15),
  ];
  return (
    Math.round(
      (freshness * weights[0] +
        coverage * weights[1] +
        engagement * weights[2]) *
        100,
    ) / 100
  );
}
export async function refreshRankings() {
  const articles = await db.article.findMany({
    select: {
      id: true,
      publishedAt: true,
      hnScore: true,
      storyClusterId: true,
      canonicalUrl: true,
      countryCodes: true,
      classificationStatus: true,
      contentKind: true,
    },
  });
  const coverage = new Map<string, Set<string>>();
  const bdCoverage = new Map<string, Set<string>>();
  for (const article of articles) {
    const hosts = coverage.get(article.storyClusterId) || new Set<string>();
    hosts.add(new URL(article.canonicalUrl).hostname);
    coverage.set(article.storyClusterId, hosts);
    if (
      article.countryCodes.includes("BD") &&
      article.classificationStatus === "ACCEPTED" &&
      article.contentKind === "REPORTING"
    ) {
      const bdHosts =
        bdCoverage.get(article.storyClusterId) || new Set<string>();
      bdHosts.add(new URL(article.canonicalUrl).hostname);
      bdCoverage.set(article.storyClusterId, bdHosts);
    }
  }
  for (let i = 0; i < articles.length; i += 100)
    await db.$transaction(
      articles.slice(i, i + 100).map((a) =>
        db.article.update({
          where: { id: a.id },
          data: {
            trendingScore: trendingScore(
              a.publishedAt,
              coverage.get(a.storyClusterId)?.size || 1,
              a.hnScore,
            ),
            bangladeshTrendingScore: bangladeshTrendingScore(
              a.publishedAt,
              bdCoverage.get(a.storyClusterId)?.size || 0,
            ),
          },
        }),
      ),
    );
}
export function bangladeshTrendingScore(
  publishedAt: Date,
  publishers: number,
  now = Date.now(),
) {
  return (
    Math.round(
      (70 *
        Math.exp(-Math.max(0, now - publishedAt.getTime()) / (48 * 3600000)) +
        30 * Math.min(1, Math.log2(Math.max(1, publishers)) / 3)) *
        100,
    ) / 100
  );
}
