import { z } from "zod";
import { BD_CATEGORIES, type ContentKind } from "./bangladesh.js";
export * from "./bangladesh.js";

export const CATEGORIES = [
  ["artificial-intelligence", "Artificial Intelligence", "AI"],
  ["cybersecurity", "Cybersecurity", "Security"],
  ["software-development", "Software Development", "Code"],
  ["cloud-computing", "Cloud Computing", "Cloud"],
  ["smartphones", "Smartphones", "Mobile"],
  ["consumer-electronics", "Consumer Electronics", "Gadgets"],
  ["hardware", "Hardware", "Hardware"],
  ["startups", "Startups", "Startups"],
  ["big-tech", "Big Tech", "Big Tech"],
  ["robotics", "Robotics", "Robotics"],
  ["blockchain", "Blockchain", "Web3"],
  ["gaming", "Gaming", "Gaming"],
  ["space-technology", "Space Technology", "Space"],
  ["emerging-technologies", "Emerging Technologies", "Emerging"],
] as const;
export const safeUrl = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  }, "Only public HTTP(S) URLs are supported");
export const incomingArticleSchema = z.object({
  externalId: z.string().min(1).max(500),
  title: z.string().min(3).max(700),
  searchText: z.string().max(2400).default(""),
  originalUrl: safeUrl,
  canonicalUrl: safeUrl,
  description: z.string().max(320).nullable(),
  imageUrl: safeUrl.nullable(),
  author: z.string().max(200).nullable(),
  publisherName: z.string().max(200).nullable().default(null),
  publishedAt: z
    .date()
    .refine(
      (d) => d.getTime() > 0 && d.getTime() <= Date.now() + 300_000,
      "Invalid publication timestamp",
    ),
  language: z
    .string()
    .regex(/^[a-z]{2,3}$/)
    .nullable(),
  region: z.string().max(100).nullable(),
  hnScore: z.number().int().nonnegative().nullable(),
  categories: z.array(z.string()),
  tags: z.array(z.string()).max(10),
  countryCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).default([]),
  technologyRelevanceScore: z.number().int().min(0).max(100).default(0),
  bangladeshRelevanceScore: z.number().int().min(0).max(100).default(0),
  classificationStatus: z
    .enum(["ACCEPTED", "REJECTED", "NEEDS_REVIEW"])
    .default("NEEDS_REVIEW"),
  classificationReason: z
    .string()
    .max(1200)
    .default("Not assessed for Bangladesh"),
  classifierVersion: z.string().max(50).nullable().default(null),
  classifiedAt: z.date().nullable().default(null),
  contentKind: z
    .enum([
      "REPORTING",
      "OFFICIAL_ANNOUNCEMENT",
      "PRESS_RELEASE",
      "SPONSORED",
      "BRANDED_CONTENT",
    ])
    .default("REPORTING"),
});
export type IncomingArticle = z.infer<typeof incomingArticleSchema>;
export const newsQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    category: z.string().max(80).optional(),
    source: z.string().max(200).optional(),
    language: z
      .string()
      .regex(/^[a-z]{2,3}$/)
      .optional(),
    region: z.string().max(100).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    sort: z.enum(["newest", "trending"]).default("newest"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    ids: z.string().max(8000).optional(),
  })
  .strict()
  .refine((v) => !v.from || !v.to || new Date(v.from) <= new Date(v.to), {
    message: "from must precede to",
    path: ["from"],
  });
export type NewsQuery = z.infer<typeof newsQuerySchema>;
const regionalDate = z.string().refine((value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }
  return z.string().datetime({ offset: true }).safeParse(value).success;
}, "Use a valid YYYY-MM-DD date or an ISO timestamp with timezone");
export const bangladeshNewsQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    category: z
      .string()
      .max(200)
      .refine(
        (v) => v.split(",").every((s) => BD_CATEGORIES.some((c) => c[0] === s)),
        "Unknown Bangladesh category",
      )
      .optional(),
    source: z.string().max(300).optional(),
    language: z.enum(["en", "bn"]).optional(),
    dateFrom: regionalDate.optional(),
    dateTo: regionalDate.optional(),
    sort: z.enum(["newest", "trending"]).default("newest"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict()
  .transform((v) => ({
    q: v.search,
    category: v.category,
    source: v.source,
    language: v.language,
    sort: v.sort,
    page: v.page,
    limit: v.limit,
    from:
      v.dateFrom?.length === 10
        ? `${v.dateFrom}T00:00:00.000+06:00`
        : v.dateFrom,
    to: v.dateTo?.length === 10 ? `${v.dateTo}T23:59:59.999+06:00` : v.dateTo,
  }))
  .pipe(newsQuerySchema);
export interface Source {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  color: string;
  enabled: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  articleCount: number;
  scope?: string;
  sourceKind?: string;
  verificationStatus?: string;
  collectionNotes?: string | null;
}
export interface Category {
  slug: string;
  name: string;
  shortName: string;
  count: number;
}
export interface Article {
  id: string;
  title: string;
  description: string | null;
  originalUrl: string;
  imageUrl: string | null;
  author: string | null;
  publisherName?: string | null;
  publishedAt: string;
  fetchedAt: string;
  language: string | null;
  region: string | null;
  trendingScore: number;
  hnScore: number | null;
  coverageCount: number;
  source: Pick<Source, "id" | "slug" | "name" | "color">;
  categories: { slug: string; name: string }[];
  tags: string[];
  countryCodes?: string[];
  technologyRelevanceScore?: number;
  bangladeshRelevanceScore?: number;
  classificationStatus?: string;
  classificationReason?: string;
  classificationLocked?: boolean;
  contentKind?: ContentKind;
}
export interface NewsResponse {
  data: Article[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    lastCollectedAt: string | null;
    scope?: "bangladesh";
  };
}
export interface Health {
  status: string;
  database: string;
  collection: {
    lastFinishedAt: string | null;
    lastSuccessAt: string | null;
    lastStatus: string | null;
    lastHeartbeatAt: string | null;
    stale: boolean;
  };
}
