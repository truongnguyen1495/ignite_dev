-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('IMPORTANT', 'UPDATE', 'GENERAL');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Announcement_category_idx" ON "Announcement"("category");
