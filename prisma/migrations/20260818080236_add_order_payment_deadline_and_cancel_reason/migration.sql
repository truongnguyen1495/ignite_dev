-- CreateEnum
CREATE TYPE "OrderCancelReason" AS ENUM ('CUSTOMER_CHANGED_MIND', 'OUT_OF_STOCK', 'UNREACHABLE_CUSTOMER', 'DUPLICATE_ORDER', 'OTHER', 'SYSTEM_EXPIRED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelNote" TEXT,
ADD COLUMN     "cancelReason" "OrderCancelReason",
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "paymentDeadline" TIMESTAMP(3),
ADD COLUMN     "revivedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
