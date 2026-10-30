ALTER TABLE "Article" ADD CONSTRAINT "Article_technology_score_range" CHECK ("technologyRelevanceScore" BETWEEN 0 AND 100);
ALTER TABLE "Article" ADD CONSTRAINT "Article_bangladesh_score_range" CHECK ("bangladeshRelevanceScore" BETWEEN 0 AND 100);
CREATE INDEX "Article_bd_newest_partial_idx" ON "Article" ("publishedAt" DESC, id DESC)
 WHERE "classificationStatus"='ACCEPTED' AND "countryCodes" @> ARRAY['BD']::TEXT[];
CREATE INDEX "Article_bd_trending_partial_idx" ON "Article" ("bangladeshTrendingScore" DESC,"publishedAt" DESC,id DESC)
 WHERE "classificationStatus"='ACCEPTED' AND "countryCodes" @> ARRAY['BD']::TEXT[];
UPDATE "NewsSource" SET "sourceKind"='AGGREGATOR' WHERE slug IN ('hacker-news','gnews');
