-- CreateEnum
CREATE TYPE "LibraryItemType" AS ENUM ('BOOK', 'DOCUMENT');

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "type" "LibraryItemType" NOT NULL DEFAULT 'BOOK',
    "coverImageUrl" TEXT,
    "filePath" TEXT NOT NULL,
    "pageCount" INTEGER,
    "previewFilePath" TEXT,
    "guestPreviewPages" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visibleToGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryAccessGrant" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "LibraryAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryLevelGrant" (
    "id" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "minLevel" "Level" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "LibraryLevelGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryItem_type_order_idx" ON "LibraryItem"("type", "order");

-- CreateIndex
CREATE INDEX "LibraryAccessGrant_studentId_idx" ON "LibraryAccessGrant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryAccessGrant_studentId_libraryItemId_key" ON "LibraryAccessGrant"("studentId", "libraryItemId");

-- CreateIndex
CREATE INDEX "LibraryLevelGrant_libraryItemId_idx" ON "LibraryLevelGrant"("libraryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryLevelGrant_libraryItemId_minLevel_key" ON "LibraryLevelGrant"("libraryItemId", "minLevel");

-- AddForeignKey
ALTER TABLE "LibraryAccessGrant" ADD CONSTRAINT "LibraryAccessGrant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryAccessGrant" ADD CONSTRAINT "LibraryAccessGrant_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryAccessGrant" ADD CONSTRAINT "LibraryAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLevelGrant" ADD CONSTRAINT "LibraryLevelGrant_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryLevelGrant" ADD CONSTRAINT "LibraryLevelGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
