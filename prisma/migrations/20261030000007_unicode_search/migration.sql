ALTER TABLE "Article" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Article_searchText_trgm_idx" ON "Article" USING GIN ("searchText" gin_trgm_ops);
