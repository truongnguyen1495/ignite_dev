-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "enforceLessonWatchForHocSinh" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enforceLessonWatchForHocVien" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lessonWatchThresholdPercent" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "showLessonWatchProgressToGuest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CourseLessonWatchProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseLessonId" TEXT NOT NULL,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseLessonWatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseLessonWatchProgress_studentId_idx" ON "CourseLessonWatchProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseLessonWatchProgress_studentId_courseLessonId_key" ON "CourseLessonWatchProgress"("studentId", "courseLessonId");

-- AddForeignKey
ALTER TABLE "CourseLessonWatchProgress" ADD CONSTRAINT "CourseLessonWatchProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLessonWatchProgress" ADD CONSTRAINT "CourseLessonWatchProgress_courseLessonId_fkey" FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
