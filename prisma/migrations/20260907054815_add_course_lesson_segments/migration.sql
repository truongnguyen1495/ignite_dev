-- CreateTable
CREATE TABLE "CourseLessonSegment" (
    "id" TEXT NOT NULL,
    "courseLessonId" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseLessonSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseLessonSegment_courseLessonId_order_idx" ON "CourseLessonSegment"("courseLessonId", "order");

-- AddForeignKey
ALTER TABLE "CourseLessonSegment" ADD CONSTRAINT "CourseLessonSegment_courseLessonId_fkey" FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
