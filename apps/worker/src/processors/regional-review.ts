import { db } from "@techpulse/db";
import { classifyBangladesh, CLASSIFIER_VERSION } from "./bangladesh.js";
import type { ClassificationStatus } from "@techpulse/shared";
export async function reviewBangladeshArticle(
  id: string,
  status: ClassificationStatus,
  reason: string,
  categories?: string[],
) {
  if (reason.trim().length < 12 || reason.length > 900)
    throw new Error("Supply a public review reason of 12–900 characters.");
  const row = await db.article.findUniqueOrThrow({ where: { id } });
  const chosen =
    categories === undefined
      ? undefined
      : await db.category.findMany({
          where: {
            scope: "BANGLADESH",
            slug: { in: categories.map((c) => `bd-${c}`) },
          },
        });
  if (categories && chosen?.length !== new Set(categories).size)
    throw new Error("Unknown Bangladesh category");
  await db.$transaction(async (tx) => {
    await tx.article.update({
      where: { id },
      data: {
        classificationStatus: status,
        classificationReason: `Manual review: ${reason.trim()}`,
        classificationLocked: true,
        reviewedAt: new Date(),
        countryCodes:
          status === "ACCEPTED"
            ? [...new Set([...row.countryCodes, "BD"])]
            : row.countryCodes.filter((c) => c !== "BD"),
      },
    });
    if (chosen) {
      await tx.articleCategory.deleteMany({
        where: { articleId: id, category: { scope: "BANGLADESH" } },
      });
      if (status === "ACCEPTED")
        await tx.articleCategory.createMany({
          data: chosen.map((c) => ({ articleId: id, categoryId: c.id })),
        });
    }
  });
}
export async function classifyExistingBangladesh() {
  let cursor: string | undefined,
    count = 0;
  for (;;) {
    const rows = await db.article.findMany({
      where: {
        classificationLocked: false,
        OR: [
          { classifierVersion: null },
          { classifierVersion: { not: CLASSIFIER_VERSION } },
        ],
      },
      take: 100,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { tags: { include: { tag: true } } },
    });
    if (!rows.length) break;
    for (const row of rows) {
      const { categories, ...result } = classifyBangladesh({
        title: row.title,
        description: row.description || "",
        tags: row.tags.map((t) => t.tag.name),
      });
      await db.$transaction(async (tx) => {
        const updated = await tx.article.updateMany({
          where: { id: row.id, classificationLocked: false },
          data: {
            ...result,
            countryCodes: [
              ...new Set([
                ...row.countryCodes.filter((c) => c !== "BD"),
                ...result.countryCodes,
              ]),
            ],
            searchText:
              `${row.title} ${row.description || ""} ${row.tags.map((t) => t.tag.name).join(" ")}`
                .normalize("NFC")
                .toLowerCase()
                .slice(0, 2400),
          },
        });
        if (!updated.count) return;
        await tx.articleCategory.deleteMany({
          where: { articleId: row.id, category: { scope: "BANGLADESH" } },
        });
        const matches = await tx.category.findMany({
          where: { slug: { in: categories } },
        });
        if (matches.length)
          await tx.articleCategory.createMany({
            data: matches.map((c) => ({ articleId: row.id, categoryId: c.id })),
          });
      });
      count++;
    }
    cursor = rows[rows.length - 1].id;
  }
  return count;
}
