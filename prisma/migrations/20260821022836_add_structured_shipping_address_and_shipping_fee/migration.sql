-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "provinceCode" TEXT,
ADD COLUMN     "provinceName" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "wardCode" TEXT,
ADD COLUMN     "wardName" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingProvinceCode" TEXT,
ADD COLUMN     "shippingProvinceName" TEXT,
ADD COLUMN     "shippingStreet" TEXT,
ADD COLUMN     "shippingWardCode" TEXT,
ADD COLUMN     "shippingWardName" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "freeShippingFromItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingFee" INTEGER NOT NULL DEFAULT 25000;
