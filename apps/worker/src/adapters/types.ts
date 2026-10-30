import type { NewsSource } from "@prisma/client";
import type { RawArticle } from "../processors/article.js";
export interface AdapterResult {
  articles: RawArticle[];
  notModified?: boolean;
  etag?: string | null;
  lastModified?: string | null;
  cacheSeconds?: number | null;
  warnings?: number;
}
export interface SourceAdapter {
  collect(source: NewsSource): Promise<AdapterResult>;
}
