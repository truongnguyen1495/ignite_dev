-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "visibleToGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "visibleToGuest" BOOLEAN NOT NULL DEFAULT false;
