-- CreateTable
CREATE TABLE "CourseLevelGrant" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "minLevel" "Level" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "CourseLevelGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseLevelGrant_courseId_minLevel_key" ON "CourseLevelGrant"("courseId", "minLevel");

-- CreateIndex
CREATE INDEX "CourseLevelGrant_courseId_idx" ON "CourseLevelGrant"("courseId");

-- AddForeignKey
ALTER TABLE "CourseLevelGrant" ADD CONSTRAINT "CourseLevelGrant_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLevelGrant" ADD CONSTRAINT "CourseLevelGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
