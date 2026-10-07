-- AlterEnum
ALTER TYPE "AdminPermissionKind" ADD VALUE 'MANAGE_NETWORK';

-- CreateEnum
CREATE TYPE "NetworkMemberStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE', 'ZERO_PP', 'CUSTOMER');

-- CreateTable
CREATE TABLE "NetworkMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "igniteId" TEXT,
    "status" "NetworkMemberStatus" NOT NULL,
    "team" TEXT,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "leaderId" TEXT,
    "referrerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkMemberStatusHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fromStatus" "NetworkMemberStatus",
    "toStatus" "NetworkMemberStatus" NOT NULL,
    "reason" TEXT,
    "effectiveDate" DATE NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkMemberStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkMember_igniteId_key" ON "NetworkMember"("igniteId");

-- CreateIndex
CREATE INDEX "NetworkMember_leaderId_idx" ON "NetworkMember"("leaderId");

-- CreateIndex
CREATE INDEX "NetworkMember_referrerId_idx" ON "NetworkMember"("referrerId");

-- CreateIndex
CREATE INDEX "NetworkMember_status_idx" ON "NetworkMember"("status");

-- CreateIndex
CREATE INDEX "NetworkMemberStatusHistory_memberId_effectiveDate_idx" ON "NetworkMemberStatusHistory"("memberId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "NetworkMember" ADD CONSTRAINT "NetworkMember_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "NetworkMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMember" ADD CONSTRAINT "NetworkMember_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "NetworkMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberStatusHistory" ADD CONSTRAINT "NetworkMemberStatusHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "NetworkMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMemberStatusHistory" ADD CONSTRAINT "NetworkMemberStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
