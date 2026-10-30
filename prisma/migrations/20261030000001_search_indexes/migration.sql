CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Article_title_trgm_idx" ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Article_description_trgm_idx" ON "Article" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Tag_name_trgm_idx" ON "Tag" USING GIN ("name" gin_trgm_ops);
ALTER TABLE "Article" ADD CONSTRAINT "Article_title_nonempty" CHECK (length(trim("title")) >= 3);
ALTER TABLE "Article" ADD CONSTRAINT "Article_hnScore_nonnegative" CHECK ("hnScore" IS NULL OR "hnScore" >= 0);
