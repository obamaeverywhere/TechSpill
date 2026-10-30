import { z } from "zod";
const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
export function validateEnvironment(kind: "api" | "worker") {
  const common = z.object({
    DATABASE_URL: z.string().url(),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .optional(),
  });
  const schema =
    kind === "api"
      ? common.extend({
          PORT: integer(4000, 1, 65535),
          TRUST_PROXY_HOPS: integer(0, 0, 5),
          WORKER_STALE_MINUTES: integer(30, 1, 10080),
        })
      : common.extend({
          COLLECTION_CONCURRENCY: integer(3, 1, 8),
          FETCH_TIMEOUT_MS: integer(15000, 1000, 60000),
          FETCH_RETRIES: integer(2, 0, 3),
          HN_STORY_LIMIT: integer(35, 1, 100),
          GNEWS_DAILY_REQUEST_LIMIT: integer(24, 1, 10000),
          GNEWS_BD_LANGUAGE: z.enum(["en", "bn"]).optional(),
          TREND_FRESHNESS_WEIGHT: integer(60, 0, 100),
          TREND_COVERAGE_WEIGHT: integer(25, 0, 100),
          TREND_ENGAGEMENT_WEIGHT: integer(15, 0, 100),
        });
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment variables: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
}
