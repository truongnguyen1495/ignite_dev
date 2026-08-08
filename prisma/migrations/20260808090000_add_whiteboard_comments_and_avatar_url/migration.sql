-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "WhiteboardCommentThread" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "anchorU" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "anchorV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhiteboardCommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardComment" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhiteboardComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardCommentThread_whiteboardId_idx" ON "WhiteboardCommentThread"("whiteboardId");

-- CreateIndex
CREATE INDEX "WhiteboardCommentThread_elementId_idx" ON "WhiteboardCommentThread"("elementId");

-- CreateIndex
CREATE INDEX "WhiteboardComment_threadId_idx" ON "WhiteboardComment"("threadId");

-- AddForeignKey
ALTER TABLE "WhiteboardCommentThread" ADD CONSTRAINT "WhiteboardCommentThread_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "Whiteboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardComment" ADD CONSTRAINT "WhiteboardComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "WhiteboardCommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardComment" ADD CONSTRAINT "WhiteboardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
