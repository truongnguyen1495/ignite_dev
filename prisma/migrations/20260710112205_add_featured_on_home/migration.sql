-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN     "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;
