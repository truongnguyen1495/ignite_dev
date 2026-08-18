-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'COD');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_COD';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER';
