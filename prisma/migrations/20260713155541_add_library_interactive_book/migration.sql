-- CreateEnum
CREATE TYPE "LibraryItemFormat" AS ENUM ('PDF', 'INTERACTIVE');

-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN     "format" "LibraryItemFormat" NOT NULL DEFAULT 'PDF',
ALTER COLUMN "filePath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LibraryBookPage" (
    "id" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "backgroundColor" TEXT,
    "backgroundImageUrl" TEXT,
    "elements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBookPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryBookPage_libraryItemId_order_idx" ON "LibraryBookPage"("libraryItemId", "order");

-- AddForeignKey
ALTER TABLE "LibraryBookPage" ADD CONSTRAINT "LibraryBookPage_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
