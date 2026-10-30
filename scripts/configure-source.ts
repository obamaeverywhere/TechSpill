import { z } from "zod";
import { db, SOURCE_CATALOG } from "@techpulse/db";
const [slug, ...options] = process.argv.slice(2);
if (!SOURCE_CATALOG.some((s) => s.slug === slug))
  throw new Error("Choose a source slug from the built-in catalog.");
const data: {
  enabled?: boolean;
  allowImages?: boolean;
  allowExcerpts?: boolean;
  minPollMinutes?: number;
} = {};
for (const option of options) {
  const [key, value] = option.split("=");
  if (key === "--min-poll-minutes")
    data.minPollMinutes = z.coerce
      .number()
      .int()
      .min(10)
      .max(10080)
      .parse(value);
  else {
    const field = (
      {
        "--enabled": "enabled",
        "--images": "allowImages",
        "--excerpts": "allowExcerpts",
      } as const
    )[key as "--enabled" | "--images" | "--excerpts"];
    if (!field || !["true", "false"].includes(value))
      throw new Error(
        "Use --enabled=true|false, --images=true|false, --excerpts=true|false, or --min-poll-minutes=10",
      );
    data[field] = value === "true";
  }
}
try {
  if (data.enabled) {
    const current = await db.newsSource.findUniqueOrThrow({ where: { slug } });
    if (!current.feedUrl)
      throw new Error(
        "This source has no verified feed/API endpoint and cannot be enabled.",
      );
    if (slug.startsWith("gnews") && !process.env.GNEWS_API_KEY)
      throw new Error(
        "Set the licensed backend GNEWS_API_KEY before enabling this source.",
      );
  }
  await db.newsSource.update({
    where: { slug },
    data: { ...data, etag: null, lastModified: null },
  });
  console.log(
    `Updated ${slug}. Changes apply on the next eligible feed response.`,
  );
} finally {
  await db.$disconnect();
}
