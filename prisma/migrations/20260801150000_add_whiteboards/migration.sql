-- CreateEnum
CREATE TYPE "WhiteboardAccessRole" AS ENUM ('VIEWER', 'COMMENTER', 'EDITOR');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "whiteboardsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Whiteboard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT,
    "lastEditedById" TEXT,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "viewportX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewportY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewportZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generalAccessRole" "WhiteboardAccessRole",

    CONSTRAINT "Whiteboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardCollaborator" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WhiteboardAccessRole" NOT NULL DEFAULT 'EDITOR',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,

    CONSTRAINT "WhiteboardCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Whiteboard_updatedAt_idx" ON "Whiteboard"("updatedAt");

-- CreateIndex
CREATE INDEX "WhiteboardCollaborator_userId_idx" ON "WhiteboardCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteboardCollaborator_whiteboardId_userId_key" ON "WhiteboardCollaborator"("whiteboardId", "userId");

-- AddForeignKey
ALTER TABLE "Whiteboard" ADD CONSTRAINT "Whiteboard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whiteboard" ADD CONSTRAINT "Whiteboard_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "Whiteboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
