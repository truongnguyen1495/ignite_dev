import "server-only";
import { Prisma } from "@prisma/client";
import type { DailyTask, DailyTaskCompletion, GroupRole, PersonalityTestType, SpinReward, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  BASE_SPINS_PER_DAY,
  computeStreaksFromDates,
  dateOnly,
  isPastTimeOfDayVN,
  isTaskLiveOnDate,
  pickWeightedReward,
  todayVN,
  type CreateDailyTaskInput,
} from "@/lib/groups";

// The 4 "Khám phá bản thân" cards are a fixed set (see PersonalityTestType)
// the product always wants to show — self-heals rather than needing a
// one-off seed migration/script: the first read after this feature ships
// creates whichever of the 4 rows don't exist yet, admin edits them from
// there. Cheap (at most 4 rows, checked on every read) and idempotent.
const DEFAULT_PERSONALITY_TESTS: { type: PersonalityTestType; title: string }[] = [
  { type: "DISC", title: "DISC" },
  { type: "MBTI", title: "MBTI" },
  { type: "IQ", title: "IQ" },
  { type: "EQ", title: "EQ" },
];

export async function getOrSeedPersonalityTests() {
  const existing = await prisma.personalityTest.findMany();
  const existingTypes = new Set(existing.map((t) => t.type));
  const missing = DEFAULT_PERSONALITY_TESTS.filter((t) => !existingTypes.has(t.type));
  if (missing.length === 0) return existing;

  await prisma.personalityTest.createMany({ data: missing, skipDuplicates: true });
  return prisma.personalityTest.findMany();
}

export async function getOwnGroupMembership(userId: string) {
  return prisma.groupMembership.findUnique({
    where: { userId },
    include: { group: true },
  });
}

// Live membership resolution for a DailyTask whose assignAllMembers=true —
// evaluated fresh on every call, never snapshotted at creation time (see the
// DailyTask.assignAllMembers comment in schema.prisma), so someone added to
// the group later automatically picks up every assignAllMembers task.
export async function getTaskAudienceUserIds(
  task: Pick<DailyTask, "id" | "groupId" | "assignAllMembers">
): Promise<string[]> {
  if (task.assignAllMembers) {
    const memberships = await prisma.groupMembership.findMany({
      where: { groupId: task.groupId },
      select: { userId: true },
    });
    return memberships.map((m) => m.userId);
  }
  const assignees = await prisma.dailyTaskAssignee.findMany({
    where: { taskId: task.id },
    select: { userId: true },
  });
  return assignees.map((a) => a.userId);
}

export type TodayTaskView = {
  task: DailyTask;
  completion: DailyTaskCompletion | null;
  isOverdueUntouched: boolean;
};

// Every task live today (see isTaskLiveOnDate) AND assigned to `userId` —
// resolves DailyTaskAssignee only for the minority of tasks that aren't
// assignAllMembers, one batched query rather than one per task.
export async function getTodayTasksForUser(userId: string, date: Date = todayVN()): Promise<TodayTaskView[]> {
  const membership = await getOwnGroupMembership(userId);
  if (!membership) return [];

  const day = dateOnly(date);
  const tasks = await prisma.dailyTask.findMany({
    where: { groupId: membership.groupId, startDate: { lte: day } },
    orderBy: { createdAt: "asc" },
  });
  const liveTasks = tasks.filter((t) => isTaskLiveOnDate(t, day));
  if (liveTasks.length === 0) return [];

  const specificTaskIds = liveTasks.filter((t) => !t.assignAllMembers).map((t) => t.id);
  const assignedSpecificIds = specificTaskIds.length
    ? new Set(
        (
          await prisma.dailyTaskAssignee.findMany({
            where: { taskId: { in: specificTaskIds }, userId },
            select: { taskId: true },
          })
        ).map((a) => a.taskId)
      )
    : new Set<string>();

  const applicableTasks = liveTasks.filter((t) => t.assignAllMembers || assignedSpecificIds.has(t.id));
  if (applicableTasks.length === 0) return [];

  const completions = await prisma.dailyTaskCompletion.findMany({
    where: { userId, date: day, taskId: { in: applicableTasks.map((t) => t.id) } },
  });
  const completionByTask = new Map(completions.map((c) => [c.taskId, c]));
  const isToday = day.getTime() === todayVN().getTime();

  return applicableTasks.map((task) => {
    const completion = completionByTask.get(task.id) ?? null;
    const isOverdueUntouched =
      (!completion || completion.status === "MISSED" || completion.status === "EXPLAINED_REJECTED") &&
      isToday &&
      isPastTimeOfDayVN(task.dueTime);
    return { task, completion, isOverdueUntouched };
  });
}

export async function ensureCheckedInToday(userId: string): Promise<void> {
  const today = todayVN();
  await prisma.checkIn.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today },
    update: {},
  });
}

export async function computeCheckInStreaks(userId: string): Promise<{ current: number; best: number }> {
  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const dates = checkIns.map((c) => dateOnly(c.date).getTime());
  return computeStreaksFromDates(dates, todayVN().getTime());
}

// A day counts as "goal completed" when every DailyTaskCompletion row that
// exists for the student on that date is DONE — a simplification of "hoàn
// thành mục tiêu" that only looks at days with at least one touched row
// (untouched tasks on a day with zero interaction were never a "goal" the
// student engaged with in the first place).
export async function countGoalCompletedDays(userId: string): Promise<number> {
  const rows = await prisma.dailyTaskCompletion.findMany({
    where: { userId },
    select: { date: true, status: true },
  });
  const byDate = new Map<number, boolean>();
  for (const row of rows) {
    const key = dateOnly(row.date).getTime();
    const allDoneSoFar = byDate.get(key) ?? true;
    byDate.set(key, allDoneSoFar && row.status === "DONE");
  }
  let count = 0;
  for (const allDone of byDate.values()) {
    if (allDone) count++;
  }
  return count;
}

export async function computeWeeklyPoints(userId: string, weekStart: Date): Promise<number> {
  const weekEnd = addDays(weekStart, 7);
  const [taskCompletions, spinResults] = await Promise.all([
    prisma.dailyTaskCompletion.findMany({
      where: { userId, status: "DONE", date: { gte: weekStart, lt: weekEnd } },
      include: { task: { select: { points: true } } },
    }),
    prisma.spinResult.findMany({
      where: { userId, spunAt: { gte: weekStart, lt: weekEnd } },
      include: { reward: { select: { type: true, value: true } } },
    }),
  ]);
  const fromTasks = taskCompletions.reduce((sum, c) => sum + c.task.points, 0);
  const fromSpins = spinResults
    .filter((s) => s.reward.type === "POINTS")
    .reduce((sum, s) => sum + s.reward.value, 0);
  return fromTasks + fromSpins;
}

// The allowance (base + bonuses) only depends on check-in/task-completion
// state, which spinning itself never writes to — no race to protect there,
// unlike "how many spins already used today" (see pickAndRecordSpin below).
async function computeSpinAllowanceToday(userId: string): Promise<number> {
  const today = todayVN();
  const [checkedInToday, todayTasks] = await Promise.all([
    prisma.checkIn.findUnique({ where: { userId_date: { userId, date: today } } }),
    getTodayTasksForUser(userId, today),
  ]);

  let allowance = BASE_SPINS_PER_DAY;
  if (checkedInToday) allowance += 1;
  if (todayTasks.length > 0 && todayTasks.every((t) => t.completion?.status === "DONE")) {
    allowance += 1;
  }
  return allowance;
}

export async function getSpinsRemainingToday(userId: string): Promise<number> {
  const today = todayVN();
  const tomorrow = addDays(today, 1);
  const [allowance, usedToday] = await Promise.all([
    computeSpinAllowanceToday(userId),
    prisma.spinResult.count({ where: { userId, spunAt: { gte: today, lt: tomorrow } } }),
  ]);
  return Math.max(0, allowance - usedToday);
}

// The count-then-insert here is a classic TOCTOU race: without the
// transaction, two concurrent spins (a double-click, two open tabs) could
// both read "1 spin remaining" and both succeed, letting a student spin
// more than their daily allowance. Serializable isolation makes Postgres
// abort the second transaction (error 40001 / Prisma P2034) instead of
// letting both commit — treated the same as "no spins left" below, rather
// than surfacing a raw 500 for what's really just a double-click.
export async function pickAndRecordSpin(userId: string): Promise<{ reward: SpinReward; spinsRemaining: number } | null> {
  const rewards = await prisma.spinReward.findMany({ orderBy: { order: "asc" } });
  if (rewards.length === 0) return null;

  const allowance = await computeSpinAllowanceToday(userId);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const today = todayVN();
        const tomorrow = addDays(today, 1);
        const usedToday = await tx.spinResult.count({ where: { userId, spunAt: { gte: today, lt: tomorrow } } });
        if (usedToday >= allowance) return null;

        const reward = pickWeightedReward(rewards);
        await tx.spinResult.create({ data: { userId, rewardId: reward.id } });
        return { reward, spinsRemaining: allowance - usedToday - 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return null;
    }
    throw e;
  }
}

export type LeaderboardEntry = { user: User; groupId: string; groupName: string; role: GroupRole; points: number };

// Every live task's audience size + how many of those completions are DONE
// today — the "71% hoàn thành hôm nay" stat on a group's admin detail page.
// One extra query per live task (getTaskAudienceUserIds) — fine at this
// app's scale (a handful of tasks per group per day).
export async function getGroupTodayCompletionStats(groupId: string): Promise<{ total: number; done: number }> {
  const date = todayVN();
  const tasks = await prisma.dailyTask.findMany({ where: { groupId, startDate: { lte: date } } });
  const liveTasks = tasks.filter((t) => isTaskLiveOnDate(t, date));
  if (liveTasks.length === 0) return { total: 0, done: 0 };

  let total = 0;
  let done = 0;
  for (const task of liveTasks) {
    const audience = await getTaskAudienceUserIds(task);
    total += audience.length;
    if (audience.length === 0) continue;
    done += await prisma.dailyTaskCompletion.count({
      where: { taskId: task.id, date, userId: { in: audience }, status: "DONE" },
    });
  }
  return { total, done };
}

// Every group's total weekly points, ranked — backs both a single group's
// "hạng X/Y toàn hệ thống" stat and the admin mini-game page's system-wide
// standings.
export async function getGroupWeeklyPointsRanking(
  weekStart: Date
): Promise<{ groupId: string; groupName: string; totalPoints: number }[]> {
  const entries = await getWeeklyLeaderboard(weekStart, "ALL");
  const totals = new Map<string, { groupName: string; totalPoints: number }>();
  for (const e of entries) {
    const existing = totals.get(e.groupId) ?? { groupName: e.groupName, totalPoints: 0 };
    existing.totalPoints += e.points;
    totals.set(e.groupId, existing);
  }
  return Array.from(totals.entries())
    .map(([groupId, v]) => ({ groupId, ...v }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export async function getWeeklyLeaderboard(
  weekStart: Date,
  scope: "ALL" | "GROUP",
  groupId?: string
): Promise<LeaderboardEntry[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: scope === "GROUP" && groupId ? { groupId } : {},
    include: { user: true, group: true },
  });
  if (memberships.length === 0) return [];

  const weekEnd = addDays(weekStart, 7);
  const userIds = memberships.map((m) => m.userId);

  const [taskCompletions, spinResults] = await Promise.all([
    prisma.dailyTaskCompletion.findMany({
      where: { userId: { in: userIds }, status: "DONE", date: { gte: weekStart, lt: weekEnd } },
      include: { task: { select: { points: true } } },
    }),
    prisma.spinResult.findMany({
      where: { userId: { in: userIds }, spunAt: { gte: weekStart, lt: weekEnd } },
      include: { reward: { select: { type: true, value: true } } },
    }),
  ]);

  const pointsByUser = new Map<string, number>();
  for (const c of taskCompletions) {
    pointsByUser.set(c.userId, (pointsByUser.get(c.userId) ?? 0) + c.task.points);
  }
  for (const s of spinResults) {
    if (s.reward.type !== "POINTS") continue;
    pointsByUser.set(s.userId, (pointsByUser.get(s.userId) ?? 0) + s.reward.value);
  }

  return memberships
    .map((m) => ({
      user: m.user,
      groupId: m.groupId,
      groupName: m.group.name,
      role: m.role,
      points: pointsByUser.get(m.userId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);
}

// Shared validation + Prisma.DailyTaskCreateInput shaping for "Soạn nhiệm vụ
// mới" — called by both createDailyTaskAction (the group's own LEADER/
// DEPUTY) and adminCreateDailyTaskAction (an admin managing any group); only
// the caller's authorization check differs, not this logic. Returns the
// input error message on failure so both call sites can just `return`
// whatever this gives back, matching this app's `string | undefined` action
// error convention.
export async function validateAndBuildDailyTaskData(
  groupId: string,
  input: CreateDailyTaskInput,
  createdById: string
): Promise<{ error: string } | { data: Prisma.DailyTaskCreateInput }> {
  const title = input.title.trim();
  if (!title) return { error: "Vui lòng nhập tiêu đề nhiệm vụ." };
  if (input.frequency === "WEEKLY_DAYS" && input.weekdays.length === 0) {
    return { error: "Vui lòng chọn ít nhất một thứ trong tuần." };
  }
  if (!input.audienceAll && input.memberIds.length === 0) {
    return { error: "Vui lòng chọn ít nhất một thành viên." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: "Ngày bắt đầu không hợp lệ." };
  if (!/^\d{2}:\d{2}$/.test(input.dueTime)) return { error: "Giờ hạn hoàn thành không hợp lệ." };

  let memberIds = input.memberIds;
  if (!input.audienceAll) {
    const validMembers = await prisma.groupMembership.findMany({
      where: { groupId, userId: { in: input.memberIds } },
      select: { userId: true },
    });
    if (validMembers.length !== input.memberIds.length) {
      return { error: "Một số thành viên được chọn không thuộc nhóm này." };
    }
    memberIds = validMembers.map((m) => m.userId);
  }

  return {
    data: {
      group: { connect: { id: groupId } },
      title,
      description: input.description.trim() || null,
      category: input.category,
      frequency: input.frequency,
      weekdays: input.frequency === "WEEKLY_DAYS" ? input.weekdays : [],
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      dueTime: input.dueTime,
      assignAllMembers: input.audienceAll,
      requireExplanation: input.requireExplanation,
      points: Math.max(0, Math.round(input.points)),
      createdBy: { connect: { id: createdById } },
      assignees: input.audienceAll ? undefined : { create: memberIds.map((userId) => ({ userId })) },
    },
  };
}

// Shared "duyệt/từ chối giải trình" logic — called by both
// reviewExplanationAction (the group's own LEADER/DEPUTY) and
// adminReviewExplanationAction (an admin managing any group). Returns an
// error message on failure, undefined on success, same convention as above.
export async function reviewTaskExplanation(
  completionId: string,
  groupId: string,
  reviewerId: string,
  approve: boolean
): Promise<string | undefined> {
  const completion = await prisma.dailyTaskCompletion.findUnique({
    where: { id: completionId },
    include: { task: true },
  });
  if (!completion || completion.task.groupId !== groupId) {
    return "Giải trình không tồn tại hoặc không thuộc nhóm này.";
  }
  if (completion.status !== "EXPLAINED_PENDING") {
    return "Giải trình này đã được xử lý trước đó.";
  }

  await prisma.dailyTaskCompletion.update({
    where: { id: completionId },
    data: {
      status: approve ? "EXPLAINED_APPROVED" : "EXPLAINED_REJECTED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
  return undefined;
}
