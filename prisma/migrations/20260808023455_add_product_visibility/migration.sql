-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hiddenFromGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductAccessGrant" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "ProductAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLevelGrant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minLevel" "Level" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "ProductLevelGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAccessGrant_studentId_idx" ON "ProductAccessGrant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAccessGrant_studentId_productId_key" ON "ProductAccessGrant"("studentId", "productId");

-- CreateIndex
CREATE INDEX "ProductLevelGrant_productId_idx" ON "ProductLevelGrant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLevelGrant_productId_minLevel_key" ON "ProductLevelGrant"("productId", "minLevel");

-- AddForeignKey
ALTER TABLE "ProductAccessGrant" ADD CONSTRAINT "ProductAccessGrant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccessGrant" ADD CONSTRAINT "ProductAccessGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccessGrant" ADD CONSTRAINT "ProductAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLevelGrant" ADD CONSTRAINT "ProductLevelGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLevelGrant" ADD CONSTRAINT "ProductLevelGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
