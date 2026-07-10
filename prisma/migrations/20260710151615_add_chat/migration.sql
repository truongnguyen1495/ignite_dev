-- CreateEnum
CREATE TYPE "ChatThreadKind" AS ENUM ('SUPPORT', 'DIRECT', 'GROUP');

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "kind" "ChatThreadKind" NOT NULL,
    "supportStudentId" TEXT,
    "directUserAId" TEXT,
    "directUserBId" TEXT,
    "groupLevel" "Level",
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "attachmentMime" TEXT,
    "attachmentSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThreadRead" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThreadRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_supportStudentId_key" ON "ChatThread"("supportStudentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_groupLevel_key" ON "ChatThread"("groupLevel");

-- CreateIndex
CREATE INDEX "ChatThread_kind_idx" ON "ChatThread"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_directUserAId_directUserBId_key" ON "ChatThread"("directUserAId", "directUserBId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatThreadRead_userId_idx" ON "ChatThreadRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThreadRead_threadId_userId_key" ON "ChatThreadRead"("threadId", "userId");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_supportStudentId_fkey" FOREIGN KEY ("supportStudentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_directUserAId_fkey" FOREIGN KEY ("directUserAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_directUserBId_fkey" FOREIGN KEY ("directUserBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThreadRead" ADD CONSTRAINT "ChatThreadRead_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThreadRead" ADD CONSTRAINT "ChatThreadRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
