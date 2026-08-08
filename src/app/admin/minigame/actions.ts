"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type SpinRewardType, type WeeklyRewardScope } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getWeeklyLeaderboard } from "@/lib/group-data";

export type SpinRewardInput = {
  id: string | null; // null = new row, not yet saved
  label: string;
  type: SpinRewardType;
  value: number;
  weightPercent: number;
};

// Full-replace save: rows with an id are updated, rows without one are
// created, and any existing row missing from the submitted list is deleted
// — UNLESS it already has spin history (SpinResult.rewardId), in which case
// deleting it would violate the FK and we ask the admin to zero its rate
// out instead of removing it (keeps SpinResult's history intact).
export async function saveSpinRewardsAction(rewards: SpinRewardInput[]): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_MINIGAME");

  if (rewards.length === 0) return "Cần ít nhất 1 phần thưởng.";
  for (const r of rewards) {
    if (!r.label.trim()) return "Mỗi phần thưởng cần có tên hiển thị.";
  }

  const existingIds = rewards.filter((r) => r.id).map((r) => r.id as string);
  const currentRewards = await prisma.spinReward.findMany({ select: { id: true } });
  const idsToDelete = currentRewards.map((r) => r.id).filter((id) => !existingIds.includes(id));

  if (idsToDelete.length > 0) {
    const usedCount = await prisma.spinResult.count({ where: { rewardId: { in: idsToDelete } } });
    if (usedCount > 0) {
      return "Không thể xóa phần thưởng đã có lịch sử quay — hãy đặt tỉ lệ trúng về 0% thay vì xóa.";
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (idsToDelete.length > 0) {
    operations.push(prisma.spinReward.deleteMany({ where: { id: { in: idsToDelete } } }));
  }
  rewards.forEach((r, index) => {
    const data = {
      label: r.label.trim(),
      type: r.type,
      // Clamped server-side too, not just in the editor's inputs — a
      // negative POINTS value would silently dock a student's weekly total
      // every time that segment is hit, so this is worth defending even
      // against an admin fat-fingering a minus sign, not just a tampered client.
      value: r.type === "NONE" ? 0 : Math.max(0, Math.round(r.value)),
      weightPercent: Math.max(0, Math.min(100, Math.round(r.weightPercent))),
      order: index,
    };
    operations.push(r.id ? prisma.spinReward.update({ where: { id: r.id }, data }) : prisma.spinReward.create({ data }));
  });

  await prisma.$transaction(operations);

  revalidatePath("/admin/minigame");
  revalidatePath("/dashboard/my-group");
  return undefined;
}

export type ScopedLeaderboardEntry = {
  userId: string;
  name: string;
  groupName: string;
  role: string;
  points: number;
};

export type ScopedLeaderboardResult = { entries: ScopedLeaderboardEntry[]; alreadySettled: boolean };

export async function getScopedLeaderboardAction(
  weekStart: string,
  scope: "ALL" | "GROUP",
  groupId: string | null
): Promise<ScopedLeaderboardResult> {
  await requireAdminPermission("MANAGE_MINIGAME");
  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);

  const [entries, existing] = await Promise.all([
    getWeeklyLeaderboard(weekStartDate, scope, groupId ?? undefined),
    prisma.weeklyRewardEntry.findFirst({ where: { weekStart: weekStartDate, scope, groupId } }),
  ]);

  return {
    entries: entries.map((e) => ({
      userId: e.user.id,
      name: e.user.name,
      groupName: e.groupName,
      role: e.role,
      points: e.points,
    })),
    alreadySettled: !!existing,
  };
}

export type WinnerInput = { rank: number; userId: string; prizeText: string };

export async function settleWeeklyRewardsAction(
  weekStart: string,
  scope: WeeklyRewardScope,
  groupId: string | null,
  winners: WinnerInput[]
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_MINIGAME");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return "Tuần không hợp lệ.";
  if (winners.length === 0) return "Cần ít nhất 1 người thắng.";
  for (const w of winners) {
    if (!w.prizeText.trim()) return "Vui lòng nhập phần thưởng cho mỗi hạng.";
  }

  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
  const resolvedGroupId = scope === "GROUP" ? groupId : null;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Standard SQL unique constraints never treat two NULLs as equal, so
        // @@unique([weekStart, scope, groupId, rank]) does NOT actually stop
        // duplicate rows when groupId is NULL — exactly the "ALL" scope case.
        // The check-then-insert here is the only real guard for that scope,
        // so it needs Serializable isolation (same reasoning as
        // pickAndRecordSpin's double-spin race) rather than trusting the DB
        // constraint to catch a concurrent double-submit.
        const existing = await tx.weeklyRewardEntry.findFirst({
          where: { weekStart: weekStartDate, scope, groupId: resolvedGroupId },
        });
        if (existing) throw new AlreadySettledError();

        await tx.weeklyRewardEntry.createMany({
          data: winners.map((w) => ({
            weekStart: weekStartDate,
            scope,
            groupId: resolvedGroupId,
            rank: w.rank,
            userId: w.userId,
            prizeText: w.prizeText.trim(),
            settledById: admin.id,
          })),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e) {
    if (e instanceof AlreadySettledError) return "Tuần này đã được trao thưởng rồi.";
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return "Có yêu cầu trao thưởng khác đang xử lý cùng lúc — vui lòng thử lại.";
    }
    throw e;
  }

  revalidatePath("/admin/minigame");
  return undefined;
}

class AlreadySettledError extends Error {}
