-- CreateEnum
CREATE TYPE "GuestChatSender" AS ENUM ('GUEST', 'ADMIN');

-- CreateTable
CREATE TABLE "GuestChatThread" (
    "id" TEXT NOT NULL,
    "guestSessionId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sender" "GuestChatSender" NOT NULL,
    "senderAdminId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestChatThreadRead" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestChatThreadRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestChatThread_guestSessionId_key" ON "GuestChatThread"("guestSessionId");

-- CreateIndex
CREATE INDEX "GuestChatMessage_threadId_createdAt_idx" ON "GuestChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestChatThreadRead_adminId_idx" ON "GuestChatThreadRead"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestChatThreadRead_threadId_adminId_key" ON "GuestChatThreadRead"("threadId", "adminId");

-- AddForeignKey
ALTER TABLE "GuestChatMessage" ADD CONSTRAINT "GuestChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "GuestChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestChatMessage" ADD CONSTRAINT "GuestChatMessage_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestChatThreadRead" ADD CONSTRAINT "GuestChatThreadRead_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "GuestChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestChatThreadRead" ADD CONSTRAINT "GuestChatThreadRead_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
