-- CreateEnum
CREATE TYPE "NewsScope" AS ENUM ('GLOBAL', 'BANGLADESH');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('EDITORIAL', 'OFFICIAL', 'COMPANY', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('REPORTING', 'OFFICIAL_ANNOUNCEMENT', 'PRESS_RELEASE', 'SPONSORED', 'BRANDED_CONTENT');

-- DropIndex
DROP INDEX "Article_description_trgm_idx";

-- DropIndex
DROP INDEX "Article_title_trgm_idx";

-- DropIndex
DROP INDEX "Tag_name_trgm_idx";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "bangladeshRelevanceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bangladeshTrendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "classificationLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "classificationReason" TEXT NOT NULL DEFAULT 'Not assessed for Bangladesh',
ADD COLUMN     "classificationStatus" "ClassificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
ADD COLUMN     "classifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "classifierVersion" TEXT,
ADD COLUMN     "contentKind" "ContentKind" NOT NULL DEFAULT 'REPORTING',
ADD COLUMN     "countryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN     "technologyRelevanceScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "scope" "NewsScope" NOT NULL DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "CollectionLog" ADD COLUMN     "regionalAccepted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regionalRejected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regionalReview" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "NewsSource" ADD COLUMN     "collectionNotes" TEXT,
ADD COLUMN     "scope" "NewsScope" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "sourceKind" "SourceKind" NOT NULL DEFAULT 'EDITORIAL',
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'EXISTING',
ADD COLUMN     "verifiedAt" TIMESTAMPTZ(3),
ALTER COLUMN "feedUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Article_countryCodes_idx" ON "Article" USING GIN ("countryCodes");

-- CreateIndex
CREATE INDEX "Article_classificationStatus_publishedAt_idx" ON "Article"("classificationStatus", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "NewsSource_scope_enabled_idx" ON "NewsSource"("scope", "enabled");

