-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "DailyTask_batchId_idx" ON "DailyTask"("batchId");
