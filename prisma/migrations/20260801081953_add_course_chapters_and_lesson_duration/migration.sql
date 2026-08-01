-- AlterTable
ALTER TABLE "CourseLesson" ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "durationSeconds" INTEGER;

-- CreateTable
CREATE TABLE "CourseChapter" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseChapter_courseId_order_idx" ON "CourseChapter"("courseId", "order");

-- CreateIndex
CREATE INDEX "CourseLesson_chapterId_idx" ON "CourseLesson"("chapterId");

-- AddForeignKey
ALTER TABLE "CourseChapter" ADD CONSTRAINT "CourseChapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
