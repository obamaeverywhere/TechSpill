-- Trigram operator-class indexes are now represented explicitly in schema.prisma.
CREATE INDEX IF NOT EXISTS "Article_title_trgm_idx" ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_description_trgm_idx" ON "Article" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Tag_name_trgm_idx" ON "Tag" USING GIN ("name" gin_trgm_ops);
ALTER TABLE "Article" ALTER COLUMN "countryCodes" SET NOT NULL;
ALTER TABLE "Article" ADD CONSTRAINT "Article_country_codes_iso" CHECK (array_to_string("countryCodes",',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');
ALTER TABLE "Article" ADD CONSTRAINT "Article_bd_acceptance_country" CHECK ("classificationStatus"<>'ACCEPTED' OR "countryCodes" @> ARRAY['BD']::TEXT[]);
