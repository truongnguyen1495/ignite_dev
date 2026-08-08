-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('LEADER', 'DEPUTY', 'MEMBER');

-- CreateEnum
CREATE TYPE "DailyTaskCategory" AS ENUM ('CALL', 'READING', 'EXERCISE', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "DailyTaskFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY_DAYS');

-- CreateEnum
CREATE TYPE "DailyTaskCompletionStatus" AS ENUM ('DONE', 'MISSED', 'EXPLAINED_PENDING', 'EXPLAINED_APPROVED', 'EXPLAINED_REJECTED');

-- CreateEnum
CREATE TYPE "PersonalityTestType" AS ENUM ('DISC', 'MBTI', 'IQ', 'EQ');

-- CreateEnum
CREATE TYPE "SpinRewardType" AS ENUM ('POINTS', 'EXTRA_SPIN', 'NONE');

-- CreateEnum
CREATE TYPE "WeeklyRewardScope" AS ENUM ('ALL', 'GROUP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminPermissionKind" ADD VALUE 'MANAGE_GROUPS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'MANAGE_TESTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'MANAGE_MINIGAME';

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DailyTaskCategory" NOT NULL DEFAULT 'OTHER',
    "frequency" "DailyTaskFrequency" NOT NULL DEFAULT 'DAILY',
    "weekdays" INTEGER[],
    "startDate" DATE NOT NULL,
    "dueTime" TEXT NOT NULL DEFAULT '23:59',
    "assignAllMembers" BOOLEAN NOT NULL DEFAULT true,
    "requireExplanation" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTaskAssignee" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DailyTaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTaskCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DailyTaskCompletionStatus" NOT NULL DEFAULT 'MISSED',
    "explanationText" TEXT,
    "explainedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityTest" (
    "id" TEXT NOT NULL,
    "type" "PersonalityTestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMinutes" INTEGER,
    "questionCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resultLabel" TEXT NOT NULL,
    "note" TEXT,
    "enteredById" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinReward" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SpinRewardType" NOT NULL DEFAULT 'POINTS',
    "value" INTEGER NOT NULL DEFAULT 0,
    "weightPercent" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpinReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "spunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRewardEntry" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "scope" "WeeklyRewardScope" NOT NULL,
    "groupId" TEXT,
    "rank" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "prizeText" TEXT NOT NULL,
    "settledById" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyRewardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_name_idx" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_userId_key" ON "GroupMembership"("userId");

-- CreateIndex
CREATE INDEX "GroupMembership_groupId_idx" ON "GroupMembership"("groupId");

-- CreateIndex
CREATE INDEX "DailyTask_groupId_idx" ON "DailyTask"("groupId");

-- CreateIndex
CREATE INDEX "DailyTaskAssignee_userId_idx" ON "DailyTaskAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTaskAssignee_taskId_userId_key" ON "DailyTaskAssignee"("taskId", "userId");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_userId_date_idx" ON "DailyTaskCompletion"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTaskCompletion_taskId_userId_date_key" ON "DailyTaskCompletion"("taskId", "userId", "date");

-- CreateIndex
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_date_key" ON "CheckIn"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityTest_type_key" ON "PersonalityTest"("type");

-- CreateIndex
CREATE INDEX "PersonalityResult_userId_idx" ON "PersonalityResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityResult_testId_userId_key" ON "PersonalityResult"("testId", "userId");

-- CreateIndex
CREATE INDEX "SpinReward_order_idx" ON "SpinReward"("order");

-- CreateIndex
CREATE INDEX "SpinResult_userId_spunAt_idx" ON "SpinResult"("userId", "spunAt");

-- CreateIndex
CREATE INDEX "WeeklyRewardEntry_userId_idx" ON "WeeklyRewardEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRewardEntry_weekStart_scope_groupId_rank_key" ON "WeeklyRewardEntry"("weekStart", "scope", "groupId", "rank");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskAssignee" ADD CONSTRAINT "DailyTaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskAssignee" ADD CONSTRAINT "DailyTaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PersonalityTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "SpinReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRewardEntry" ADD CONSTRAINT "WeeklyRewardEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRewardEntry" ADD CONSTRAINT "WeeklyRewardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRewardEntry" ADD CONSTRAINT "WeeklyRewardEntry_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

