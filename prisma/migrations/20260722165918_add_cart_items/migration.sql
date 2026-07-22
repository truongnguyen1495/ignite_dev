-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "OrderItemKind" NOT NULL,
    "courseId" TEXT,
    "libraryItemId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_studentId_idx" ON "CartItem"("studentId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
