import { db, Prisma } from "@techpulse/db";
import { bangladeshPublicWhere, publicArticleWhere } from "./news.js";
export async function listCategories(
  scope: "global" | "bangladesh" = "global",
) {
  const categories = await db.category.findMany({
    where: { scope: scope === "bangladesh" ? "BANGLADESH" : "GLOBAL" },
    include: {
      _count: {
        select: {
          articles: {
            where: {
              article:
                scope === "bangladesh"
                  ? bangladeshPublicWhere
                  : publicArticleWhere,
            },
          },
        },
      },
    },
  });
  return {
    data: categories.map((c) => ({
      slug: scope === "bangladesh" ? c.slug.replace(/^bd-/, "") : c.slug,
      name: c.name,
      shortName: c.shortName,
      count: c._count.articles,
    })),
  };
}
export async function listSources(scope: "global" | "bangladesh" = "global") {
  const publicWhere =
    scope === "bangladesh" ? bangladeshPublicWhere : publicArticleWhere;
  const where: Prisma.NewsSourceWhereInput =
    scope === "bangladesh"
      ? {
          OR: [
            { scope: "BANGLADESH" },
            { articles: { some: bangladeshPublicWhere } },
          ],
        }
      : { scope: "GLOBAL" };
  const [sources, languages, regions] = await Promise.all([
    db.newsSource.findMany({
      where,
      include: { _count: { select: { articles: { where: publicWhere } } } },
      orderBy: { name: "asc" },
    }),
    db.article.findMany({
      distinct: ["language"],
      where: { AND: [publicWhere, { language: { not: null } }] },
      select: { language: true },
    }),
    db.article.findMany({
      distinct: ["region"],
      where: { AND: [publicWhere, { region: { not: null } }] },
      select: { region: true },
    }),
  ]);
  return {
    data: sources.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      websiteUrl: s.websiteUrl,
      color: s.color,
      enabled: s.enabled,
      lastAttemptAt: s.lastAttemptAt,
      lastSuccessAt: s.lastSuccessAt,
      lastError: s.lastError,
      articleCount: s._count.articles,
      scope: s.scope,
      sourceKind: s.sourceKind,
      verificationStatus: s.verificationStatus,
      collectionNotes: s.collectionNotes,
    })),
    meta: {
      languages: languages.map((v) => v.language),
      regions: regions.map((v) => v.region),
    },
  };
}
