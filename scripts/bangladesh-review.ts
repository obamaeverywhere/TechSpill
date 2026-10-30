import { db } from "@techpulse/db";
import { z } from "zod";
import {
  reviewBangladeshArticle,
  classifyExistingBangladesh,
} from "../apps/worker/src/processors/regional-review.js";
import { refreshRankings } from "../apps/worker/src/processors/ingest.js";
const [command = "list", id, ...args] = process.argv.slice(2);
try {
  if (command === "list") {
    const rows = await db.article.findMany({
      where: {
        classificationStatus: "NEEDS_REVIEW",
        OR: [
          { source: { scope: "BANGLADESH" } },
          { bangladeshRelevanceScore: { gt: 0 } },
        ],
      },
      take: 50,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        originalUrl: true,
        language: true,
        classificationReason: true,
        technologyRelevanceScore: true,
        bangladeshRelevanceScore: true,
      },
    });
    console.log(JSON.stringify(rows, null, 2));
  } else if (command === "failures") {
    console.log(
      JSON.stringify(
        await db.collectionLog.findMany({
          where: {
            source: { scope: "BANGLADESH" },
            status: { in: ["failed", "partial"] },
          },
          take: 30,
          orderBy: { startedAt: "desc" },
          include: { source: { select: { name: true } } },
        }),
        null,
        2,
      ),
    );
  } else if (command === "backfill") {
    console.log(
      `Classified ${await classifyExistingBangladesh()} existing metadata records.`,
    );
    await refreshRankings();
  } else if (command === "unlock") {
    if (!id) throw new Error("Provide an article ID");
    await db.article.update({
      where: { id },
      data: { classificationLocked: false, reviewedAt: null },
    });
    console.log(
      "Review unlocked. The next ingestion/backfill can reclassify it.",
    );
  } else if (["accept", "reject", "review"].includes(command)) {
    if (!id) throw new Error("Provide an article ID");
    const options = Object.fromEntries(
      args.map((arg) => {
        const index = arg.indexOf("=");
        return [arg.slice(0, index), arg.slice(index + 1)];
      }),
    );
    const reason = z.string().min(12).max(900).parse(options["--reason"]);
    const categories = options["--categories"]?.split(",").filter(Boolean);
    const status =
      command === "accept"
        ? "ACCEPTED"
        : command === "reject"
          ? "REJECTED"
          : "NEEDS_REVIEW";
    await reviewBangladeshArticle(id, status, reason, categories);
    await refreshRankings();
    console.log(
      `Article ${id}: ${status}. Manual decision is protected from automatic overwrite.`,
    );
  } else
    throw new Error(
      "Commands: list, failures, backfill, accept ID --reason=... [--categories=ai,software], reject ID --reason=..., review ID --reason=..., unlock ID",
    );
} finally {
  await db.$disconnect();
}
