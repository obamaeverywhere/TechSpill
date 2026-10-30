import { db, Prisma } from "@techpulse/db";
import type { NewsQuery, Article, NewsResponse } from "@techpulse/shared";

export const bangladeshPublicWhere: Prisma.ArticleWhereInput = {
  classificationStatus: "ACCEPTED",
  countryCodes: { has: "BD" },
};
export const publicArticleWhere: Prisma.ArticleWhereInput = {
  OR: [{ source: { scope: "GLOBAL" } }, bangladeshPublicWhere],
};
export function buildWhere(
  query: NewsQuery,
  scope: "global" | "bangladesh" = "global",
): Prisma.ArticleWhereInput {
  const and: Prisma.ArticleWhereInput[] = [
    scope === "bangladesh" ? bangladeshPublicWhere : publicArticleWhere,
  ];
  if (query.q)
    and.push({
      OR: [
        {
          searchText: {
            contains: query.q.normalize("NFC"),
            mode: "insensitive",
          },
        },
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        {
          tags: {
            some: { tag: { name: { contains: query.q, mode: "insensitive" } } },
          },
        },
      ],
    });
  if (query.category)
    and.push({
      categories: {
        some: {
          category: {
            slug: {
              in: query.category
                .split(",")
                .slice(0, 15)
                .map((slug) => (scope === "bangladesh" ? `bd-${slug}` : slug)),
            },
          },
        },
      },
    });
  if (query.source)
    and.push({
      source: { slug: { in: query.source.split(",").slice(0, 10) } },
    });
  if (query.language) and.push({ language: query.language });
  if (query.region) and.push({ region: query.region });
  if (query.from || query.to)
    and.push({
      publishedAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    });
  if (query.ids !== undefined)
    and.push({
      id: { in: query.ids.split(",").filter(Boolean).slice(0, 100) },
    });
  return { AND: and };
}
export const articleInclude = {
  source: { select: { id: true, slug: true, name: true, color: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  storyCluster: {
    select: {
      articles: {
        select: {
          canonicalUrl: true,
          contentKind: true,
          classificationStatus: true,
          countryCodes: true,
        },
      },
    },
  },
} satisfies Prisma.ArticleInclude;
type JoinedArticle = Prisma.ArticleGetPayload<{
  include: typeof articleInclude;
}>;
export function serializeArticle(
  a: JoinedArticle,
  scope: "global" | "bangladesh" = "global",
): Article {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    originalUrl: a.originalUrl,
    imageUrl: a.imageUrl,
    author: a.author,
    publisherName: a.publisherName,
    publishedAt: a.publishedAt.toISOString(),
    fetchedAt: a.fetchedAt.toISOString(),
    language: a.language,
    region: a.region,
    trendingScore:
      scope === "bangladesh" ? a.bangladeshTrendingScore : a.trendingScore,
    hnScore: a.hnScore,
    coverageCount: new Set(
      a.storyCluster.articles
        .filter(
          (v) =>
            scope === "global" ||
            (v.contentKind === "REPORTING" &&
              v.classificationStatus === "ACCEPTED" &&
              v.countryCodes.includes("BD")),
        )
        .map((v) => new URL(v.canonicalUrl).hostname),
    ).size,
    source: a.source,
    categories: a.categories
      .filter(
        (c) =>
          c.category.scope ===
          (scope === "bangladesh" ? "BANGLADESH" : "GLOBAL"),
      )
      .map((c) => ({
        slug:
          scope === "bangladesh"
            ? c.category.slug.replace(/^bd-/, "")
            : c.category.slug,
        name: c.category.name,
      })),
    tags: a.tags.map((t) => t.tag.name),
    countryCodes: a.countryCodes,
    technologyRelevanceScore: a.technologyRelevanceScore,
    bangladeshRelevanceScore: a.bangladeshRelevanceScore,
    classificationStatus: a.classificationStatus,
    classificationReason: a.classificationReason,
    classificationLocked: a.classificationLocked,
    contentKind: a.contentKind,
  };
}
export async function listNews(
  query: NewsQuery,
  scope: "global" | "bangladesh" = "global",
): Promise<NewsResponse> {
  const where = buildWhere(query, scope);
  const [total, rows, latest] = await db.$transaction(
    [
      db.article.count({ where }),
      db.article.findMany({
        where,
        orderBy:
          query.sort === "trending"
            ? [
                scope === "bangladesh"
                  ? { bangladeshTrendingScore: "desc" }
                  : { trendingScore: "desc" },
                { publishedAt: "desc" },
                { id: "desc" },
              ]
            : [{ publishedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: articleInclude,
      }),
      db.newsSource.aggregate({
        where:
          scope === "bangladesh"
            ? {
                OR: [
                  { scope: "BANGLADESH" },
                  { articles: { some: bangladeshPublicWhere } },
                ],
              }
            : { scope: "GLOBAL" },
        _max: { lastSuccessAt: true },
      }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    data: rows.map((a) => serializeArticle(a, scope)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      lastCollectedAt: latest._max.lastSuccessAt?.toISOString() ?? null,
      ...(scope === "bangladesh" ? { scope: "bangladesh" as const } : {}),
    },
  };
}
