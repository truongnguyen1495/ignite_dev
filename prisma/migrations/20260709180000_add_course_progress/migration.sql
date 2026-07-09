-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "coverImageUrl" TEXT;

-- CreateTable
CREATE TABLE "CourseLessonCompletion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseLessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseLessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseLessonCompletion_studentId_courseLessonId_key" ON "CourseLessonCompletion"("studentId", "courseLessonId");

-- CreateIndex
CREATE INDEX "CourseLessonCompletion_studentId_idx" ON "CourseLessonCompletion"("studentId");

-- AddForeignKey
ALTER TABLE "CourseLessonCompletion" ADD CONSTRAINT "CourseLessonCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLessonCompletion" ADD CONSTRAINT "CourseLessonCompletion_courseLessonId_fkey" FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
