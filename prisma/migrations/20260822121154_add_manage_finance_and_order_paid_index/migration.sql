-- AlterEnum
ALTER TYPE "AdminPermissionKind" ADD VALUE 'MANAGE_FINANCE';

-- CreateIndex
CREATE INDEX "Order_status_paidAt_idx" ON "Order"("status", "paidAt");
