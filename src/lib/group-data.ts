import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type {
  DailyTask,
  DailyTaskCategory,
  DailyTaskCompletion,
  DailyTaskFrequency,
  GroupRole,
  PersonalityTestType,
  SpinReward,
  SpinRewardType,
  User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  BASE_SPINS_PER_DAY,
  computeStreaksFromDates,
  dateOnly,
  formatDateVN,
  getWeekStart,
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

export type GroupWeeklyRanking = {
  groupId: string;
  groupName: string;
  memberCount: number;
  totalPoints: number;
  averagePoints: number;
};

// Every group's weekly score, ranked — backs a single group's "hạng X/Y toàn
// hệ thống" stat and the /admin/groups standings.
//
// Ranked on points PER MEMBER, not the raw total: tasks are handed out per
// person, so a 13-member group out-scores a 6-member one on sum alone no
// matter how much better the small group actually performs — and broadcasting
// one task to every group at once (see validateAndBuildBulkDailyTaskData)
// makes that skew structural. totalPoints is still returned, and still shown
// next to the average, so nothing is hidden. Ties break on the raw total,
// then on name, so the order is stable between renders.
export async function getGroupWeeklyPointsRanking(weekStart: Date): Promise<GroupWeeklyRanking[]> {
  return rankGroupsByAveragePoints(await getWeeklyLeaderboard(weekStart, "ALL"));
}

// Pure aggregation, split out from the read above so getGroupsOverview can
// rank from memberships it has already loaded instead of paying for
// getWeeklyLeaderboard's own membership query a second time.
export function rankGroupsByAveragePoints(
  entries: { groupId: string; groupName: string; points: number }[]
): GroupWeeklyRanking[] {
  const totals = new Map<string, { groupName: string; memberCount: number; totalPoints: number }>();
  for (const e of entries) {
    const existing = totals.get(e.groupId) ?? { groupName: e.groupName, memberCount: 0, totalPoints: 0 };
    // One entry per membership, so counting rows here is the group's live
    // member count — no extra query needed.
    existing.memberCount += 1;
    existing.totalPoints += e.points;
    totals.set(e.groupId, existing);
  }
  return Array.from(totals.entries())
    .map(([groupId, v]) => ({
      groupId,
      ...v,
      averagePoints: v.memberCount > 0 ? v.totalPoints / v.memberCount : 0,
    }))
    .sort(
      (a, b) =>
        b.averagePoints - a.averagePoints ||
        b.totalPoints - a.totalPoints ||
        a.groupName.localeCompare(b.groupName, "vi")
    );
}

// The two reads that make up a week's points, and the fold over them, kept
// next to each other and reusable as *queries* rather than awaited results:
// this app's DATABASE_URL pins connection_limit=1, so Promise.all does not
// actually overlap round trips — handing PrismaPromises to a caller lets it
// batch these into someone else's prisma.$transaction([...]) instead of
// paying another round trip of its own.
function weeklyPointQueries(userIds: string[], weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);
  const completions = prisma.dailyTaskCompletion.findMany({
    where: { userId: { in: userIds }, status: "DONE", date: { gte: weekStart, lt: weekEnd } },
    select: { userId: true, task: { select: { points: true } } },
  });
  const spins = prisma.spinResult.findMany({
    where: { userId: { in: userIds }, spunAt: { gte: weekStart, lt: weekEnd } },
    select: { userId: true, reward: { select: { type: true, value: true } } },
  });
  return [completions, spins] as [typeof completions, typeof spins];
}

function sumWeeklyPointsByUser(
  taskCompletions: { userId: string; task: { points: number } }[],
  spinResults: { userId: string; reward: { type: SpinRewardType; value: number } }[]
): Map<string, number> {
  const pointsByUser = new Map<string, number>();
  for (const c of taskCompletions) {
    pointsByUser.set(c.userId, (pointsByUser.get(c.userId) ?? 0) + c.task.points);
  }
  for (const s of spinResults) {
    if (s.reward.type !== "POINTS") continue;
    pointsByUser.set(s.userId, (pointsByUser.get(s.userId) ?? 0) + s.reward.value);
  }
  return pointsByUser;
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

  // One round trip for both, not two — see weeklyPointQueries.
  const [taskCompletions, spinResults] = await prisma.$transaction(
    weeklyPointQueries(
      memberships.map((m) => m.userId),
      weekStart
    )
  );
  const pointsByUser = sumWeeklyPointsByUser(taskCompletions, spinResults);

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

export type GroupOverviewRow = {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  // Only the first few, leadership first — the list page renders an avatar
  // stack, not a roster, so shipping all 13 members of every group to the
  // client would be payload with nothing to render it.
  previewMembers: { id: string; name: string; avatarUrl: string | null }[];
  leaderName: string | null;
  deputyCount: number;
  liveTaskCount: number;
  todayTotal: number;
  todayDone: number;
  pendingExplanations: number;
  totalPoints: number;
  averagePoints: number;
  rank: number | null;
};

export type GroupsOverview = {
  groups: GroupOverviewRow[];
  activeGroups: number;
  groupsWithoutLeader: number;
  membersInGroups: number;
  totalStudents: number;
  unassignedStudents: number;
  todayTotal: number;
  todayDone: number;
  pendingExplanations: number;
  oldestPendingExplainedAt: Date | null;
};

const AVATAR_STACK_SIZE = 6;
const LEADERSHIP_SORT_ORDER: Record<GroupRole, number> = { LEADER: 0, DEPUTY: 1, MEMBER: 2 };

// Everything /admin/groups renders, in a fixed number of round trips no
// matter how many groups exist.
//
// Two things drive the shape of this function:
//
// 1. getGroupTodayCompletionStats resolves one group by running a query per
//    task; calling it once per group here would be that N+1 multiplied by the
//    group count. Instead every task live today is read once, its audience
//    resolved in one batched DailyTaskAssignee read, and today's DONE rows in
//    one more — flat cost for 4 groups or for 400.
//
// 2. DATABASE_URL pins connection_limit=1 (Supabase's pooler), so Promise.all
//    does NOT overlap round trips — ten "parallel" queries cost ten times the
//    ~350ms link latency, one after another. prisma.$transaction([...]) sends
//    a batch in a single round trip instead, which is why the reads are
//    grouped into exactly two dependent waves rather than scattered.
export async function getGroupsOverview(): Promise<GroupsOverview> {
  const today = todayVN();
  const weekStart = getWeekStart(today);

  const [groups, startedTasks, pendingRows, totalStudents, unassignedStudents] = await prisma.$transaction([
    prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          orderBy: { joinedAt: "asc" },
          select: { userId: true, role: true, user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    }),
    // Every task that has started; `isTaskLiveOnDate` then decides which of
    // them actually apply today (a WEEKLY_DAYS task on an "off" weekday, a
    // ONCE task past its single date) — that rule is calendar logic, not
    // something the query can express.
    prisma.dailyTask.findMany({
      where: { startDate: { lte: today } },
      select: {
        id: true,
        groupId: true,
        assignAllMembers: true,
        frequency: true,
        startDate: true,
        weekdays: true,
      },
    }),
    prisma.dailyTaskCompletion.findMany({
      where: { status: "EXPLAINED_PENDING" },
      select: { explainedAt: true, task: { select: { groupId: true } } },
    }),
    prisma.user.count({ where: { role: "STUDENT", adminOnly: false } }),
    prisma.user.count({ where: { role: "STUDENT", adminOnly: false, groupMembership: null } }),
  ]);

  const liveTasks = startedTasks.filter((task) => isTaskLiveOnDate(task, today));
  const liveTaskIds = liveTasks.map((task) => task.id);
  const specificTaskIds = liveTasks.filter((task) => !task.assignAllMembers).map((task) => task.id);
  const allMemberIds = groups.flatMap((g) => g.memberships.map((m) => m.userId));

  // Second and last wave. The weekly-points reads ride along here rather than
  // going through getGroupWeeklyPointsRanking, which would re-read every
  // membership row this function already holds — the ranking maths itself is
  // still shared, via rankGroupsByAveragePoints.
  const [weekCompletions, weekSpins, assigneeRows, doneRows] = await prisma.$transaction([
    ...weeklyPointQueries(allMemberIds, weekStart),
    prisma.dailyTaskAssignee.findMany({
      where: { taskId: { in: specificTaskIds } },
      select: { taskId: true, userId: true },
    }),
    prisma.dailyTaskCompletion.findMany({
      where: { date: today, status: "DONE", taskId: { in: liveTaskIds } },
      select: { taskId: true, userId: true },
    }),
  ]);

  const pointsByUser = sumWeeklyPointsByUser(weekCompletions, weekSpins);
  const ranking = rankGroupsByAveragePoints(
    groups.flatMap((group) =>
      group.memberships.map((m) => ({
        groupId: group.id,
        groupName: group.name,
        points: pointsByUser.get(m.userId) ?? 0,
      }))
    )
  );

  const memberIdsByGroup = new Map(groups.map((g) => [g.id, g.memberships.map((m) => m.user.id)]));

  const assigneesByTask = new Map<string, Set<string>>();
  for (const row of assigneeRows) {
    const set = assigneesByTask.get(row.taskId) ?? new Set<string>();
    set.add(row.userId);
    assigneesByTask.set(row.taskId, set);
  }

  const audienceByTask = new Map<string, Set<string>>();
  const groupIdByTask = new Map<string, string>();
  for (const task of liveTasks) {
    groupIdByTask.set(task.id, task.groupId);
    audienceByTask.set(
      task.id,
      task.assignAllMembers
        ? new Set(memberIdsByGroup.get(task.groupId) ?? [])
        : (assigneesByTask.get(task.id) ?? new Set<string>())
    );
  }

  const todayTotalByGroup = new Map<string, number>();
  const todayDoneByGroup = new Map<string, number>();
  const liveTaskCountByGroup = new Map<string, number>();
  for (const task of liveTasks) {
    const audienceSize = audienceByTask.get(task.id)?.size ?? 0;
    todayTotalByGroup.set(task.groupId, (todayTotalByGroup.get(task.groupId) ?? 0) + audienceSize);
    liveTaskCountByGroup.set(task.groupId, (liveTaskCountByGroup.get(task.groupId) ?? 0) + 1);
  }
  for (const row of doneRows) {
    // A completion row outlives its author's membership — someone moved to
    // another group keeps their history — so it only counts toward today's
    // rate while they're still in this task's audience. Same rule as
    // getGroupTodayCompletionStats, which filters by audience in the query.
    if (!audienceByTask.get(row.taskId)?.has(row.userId)) continue;
    const groupId = groupIdByTask.get(row.taskId);
    if (!groupId) continue;
    todayDoneByGroup.set(groupId, (todayDoneByGroup.get(groupId) ?? 0) + 1);
  }

  const pendingByGroup = new Map<string, number>();
  let oldestPendingExplainedAt: Date | null = null;
  for (const row of pendingRows) {
    pendingByGroup.set(row.task.groupId, (pendingByGroup.get(row.task.groupId) ?? 0) + 1);
    if (row.explainedAt && (!oldestPendingExplainedAt || row.explainedAt < oldestPendingExplainedAt)) {
      oldestPendingExplainedAt = row.explainedAt;
    }
  }

  const scoreByGroup = new Map(ranking.map((r) => [r.groupId, r]));
  const rankByGroup = new Map(ranking.map((r, i) => [r.groupId, i + 1]));

  const rows: GroupOverviewRow[] = groups.map((group) => {
    const score = scoreByGroup.get(group.id);
    // Stable sort keeps joinedAt order inside each role bucket, so the stack
    // reads leader → deputy → longest-standing members.
    const ordered = [...group.memberships].sort(
      (a, b) => LEADERSHIP_SORT_ORDER[a.role] - LEADERSHIP_SORT_ORDER[b.role]
    );
    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      memberCount: group.memberships.length,
      previewMembers: ordered.slice(0, AVATAR_STACK_SIZE).map((m) => m.user),
      leaderName: group.memberships.find((m) => m.role === "LEADER")?.user.name ?? null,
      deputyCount: group.memberships.filter((m) => m.role === "DEPUTY").length,
      liveTaskCount: liveTaskCountByGroup.get(group.id) ?? 0,
      todayTotal: todayTotalByGroup.get(group.id) ?? 0,
      todayDone: todayDoneByGroup.get(group.id) ?? 0,
      pendingExplanations: pendingByGroup.get(group.id) ?? 0,
      totalPoints: score?.totalPoints ?? 0,
      averagePoints: score?.averagePoints ?? 0,
      rank: rankByGroup.get(group.id) ?? null,
    };
  });

  return {
    groups: rows,
    activeGroups: rows.filter((r) => r.liveTaskCount > 0).length,
    groupsWithoutLeader: rows.filter((r) => !r.leaderName).length,
    membersInGroups: rows.reduce((n, r) => n + r.memberCount, 0),
    totalStudents,
    unassignedStudents,
    todayTotal: rows.reduce((n, r) => n + r.todayTotal, 0),
    todayDone: rows.reduce((n, r) => n + r.todayDone, 0),
    pendingExplanations: pendingRows.length,
    oldestPendingExplainedAt,
  };
}

// The half of a DailyTask that says nothing about who receives it — shared
// verbatim by a single-group task, by every copy of a bulk assignment, and by
// an edit of either, so it's validated and shaped in one place instead of
// drifting between them.
export type SharedTaskFields = {
  title: string;
  description: string | null;
  category: DailyTaskCategory;
  frequency: DailyTaskFrequency;
  weekdays: number[];
  startDate: Date;
  dueTime: string;
  requireExplanation: boolean;
  points: number;
};

function validateSharedTaskFields(
  input: CreateDailyTaskInput
): { error: string } | { fields: SharedTaskFields } {
  const title = input.title.trim();
  if (!title) return { error: "Vui lòng nhập tiêu đề nhiệm vụ." };
  if (input.frequency === "WEEKLY_DAYS" && input.weekdays.length === 0) {
    return { error: "Vui lòng chọn ít nhất một thứ trong tuần." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: "Ngày bắt đầu không hợp lệ." };
  if (!/^\d{2}:\d{2}$/.test(input.dueTime)) return { error: "Giờ hạn hoàn thành không hợp lệ." };

  // The regex only proves the shape. "2026-02-31" passes it and does NOT
  // become an Invalid Date — JS silently rolls it forward to 3 March, so the
  // task would quietly start on a day nobody picked. Round-tripping the parts
  // through Date.UTC is the only way to catch that: a rolled-over date no
  // longer reports the numbers it was built from. Date.UTC (not the ISO
  // string) also keeps this on the same UTC-midnight footing as todayVN() and
  // every other @db.Date value in this feature.
  const [year, month, day] = input.startDate.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day));
  if (
    startDate.getUTCFullYear() !== year ||
    startDate.getUTCMonth() !== month - 1 ||
    startDate.getUTCDate() !== day
  ) {
    return { error: "Ngày bắt đầu không hợp lệ." };
  }

  const [hours, minutes] = input.dueTime.split(":").map(Number);
  if (hours > 23 || minutes > 59) return { error: "Giờ hạn hoàn thành không hợp lệ." };

  return {
    fields: {
      title,
      description: input.description.trim() || null,
      category: input.category,
      frequency: input.frequency,
      weekdays: input.frequency === "WEEKLY_DAYS" ? input.weekdays : [],
      startDate,
      dueTime: input.dueTime,
      requireExplanation: input.requireExplanation,
      points: Math.max(0, Math.round(input.points)),
    },
  };
}

// The other half: who inside the group receives it. Returns the explicit
// assignee list (empty when the task goes to the whole group), after checking
// every id really belongs to this group — the picker can only offer the
// group's own members, but a Server Action is reachable by direct POST too.
async function validateTaskAudience(
  groupId: string,
  input: CreateDailyTaskInput
): Promise<{ error: string } | { memberIds: string[] }> {
  if (input.audienceAll) return { memberIds: [] };
  if (input.memberIds.length === 0) return { error: "Vui lòng chọn ít nhất một thành viên." };

  const validMembers = await prisma.groupMembership.findMany({
    where: { groupId, userId: { in: input.memberIds } },
    select: { userId: true },
  });
  if (validMembers.length !== input.memberIds.length) {
    return { error: "Một số thành viên được chọn không thuộc nhóm này." };
  }
  return { memberIds: validMembers.map((m) => m.userId) };
}

// One group's task list, presentation-ready, for both the admin tab and the
// leader's own page — see GroupTasksPanel, which renders it for either.
//
// Rendering this the obvious way costs two queries PER TASK
// (getTaskAudienceUserIds + a completion count). With connection_limit=1
// those don't overlap, so 17 tasks meant ~34 sequential round trips. Here the
// audiences and both kinds of completion count are read in bulk, in two
// batched waves total.
export type GroupTaskRow = {
  id: string;
  title: string;
  repeatLabel: string | null;
  startDateLabel: string;
  isLiveToday: boolean;
  audienceSize: number;
  doneCount: number;
  batchId: string | null;
  batchGroupCount: number;
};

export async function getGroupTaskRows(groupId: string): Promise<GroupTaskRow[]> {
  const today = todayVN();

  const tasks = await prisma.dailyTask.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      frequency: true,
      startDate: true,
      weekdays: true,
      assignAllMembers: true,
      batchId: true,
    },
  });
  if (tasks.length === 0) return [];

  const liveIds = tasks.filter((t) => isTaskLiveOnDate(t, today)).map((t) => t.id);
  const liveIdSet = new Set(liveIds);
  const specificIds = tasks.filter((t) => !t.assignAllMembers).map((t) => t.id);
  const batchIds = tasks.map((t) => t.batchId).filter((id): id is string => id !== null);

  // Each query is bound to a const before going into the batch: handed to
  // $transaction inline, groupBy's return type widens and `_count._all` stops
  // resolving. Assigning first lets each one infer on its own.
  const membershipsQuery = prisma.groupMembership.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const assigneesQuery = prisma.dailyTaskAssignee.findMany({
    where: { taskId: { in: specificIds } },
    select: { taskId: true, userId: true },
  });
  const todayDoneQuery = prisma.dailyTaskCompletion.findMany({
    where: { taskId: { in: liveIds }, date: today, status: "DONE" },
    select: { taskId: true, userId: true },
  });
  // A task's "today" progress only means anything on a day it is actually
  // live (isTaskLiveOnDate). A ONCE task days past its single date, or a
  // WEEKLY_DAYS task on an "off" weekday, would otherwise sit at a stuck
  // "0/N hoàn thành" forever — completions dated *today* can't exist for a
  // day the task was never assignable on — even when everyone finished it on
  // the day it did run. Those show a lifetime total instead.
  const lifetimeDoneQuery = prisma.dailyTaskCompletion.groupBy({
    by: ["taskId"],
    where: { taskId: { in: tasks.filter((t) => !liveIdSet.has(t.id)).map((t) => t.id) }, status: "DONE" },
    // Prisma requires an explicit orderBy on groupBy; the order itself is
    // irrelevant since these rows go straight into a lookup Map.
    orderBy: { taskId: "asc" },
    _count: { _all: true },
  });
  // How many groups each bulk assignment reached — what "Gỡ cả đợt (N nhóm)"
  // counts, so it has to look past this one group.
  const batchCountsQuery = prisma.dailyTask.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds } },
    orderBy: { batchId: "asc" },
    _count: { _all: true },
  });

  const [memberships, assigneeRows, todayDoneRows, lifetimeDoneRows, batchCounts] = await prisma.$transaction([
    membershipsQuery,
    assigneesQuery,
    todayDoneQuery,
    lifetimeDoneQuery,
    batchCountsQuery,
  ]);

  const groupMemberIds = memberships.map((m) => m.userId);
  const assigneesByTask = new Map<string, Set<string>>();
  for (const row of assigneeRows) {
    const set = assigneesByTask.get(row.taskId) ?? new Set<string>();
    set.add(row.userId);
    assigneesByTask.set(row.taskId, set);
  }
  const lifetimeByTask = new Map(lifetimeDoneRows.map((r) => [r.taskId, r._count._all]));
  const batchSizeById = new Map(batchCounts.map((r) => [r.batchId, r._count._all]));

  return tasks.map((task) => {
    const audience = task.assignAllMembers
      ? new Set(groupMemberIds)
      : (assigneesByTask.get(task.id) ?? new Set<string>());
    const isLiveToday = liveIdSet.has(task.id);

    return {
      id: task.id,
      title: task.title,
      repeatLabel:
        task.frequency === "ONCE" ? null : task.frequency === "DAILY" ? "Lặp mỗi ngày" : "Lặp theo thứ",
      startDateLabel: formatDateVN(task.startDate),
      isLiveToday,
      audienceSize: audience.size,
      doneCount: isLiveToday
        ? // Completion rows outlive their author's membership, so only people
          // still in the audience count toward today's progress.
          todayDoneRows.filter((r) => r.taskId === task.id && audience.has(r.userId)).length
        : (lifetimeByTask.get(task.id) ?? 0),
      batchId: task.batchId,
      batchGroupCount: task.batchId ? (batchSizeById.get(task.batchId) ?? 1) : 0,
    };
  });
}

// One task, shaped back into the form's own input type so an edit screen can
// pre-fill every field it collects.
export async function getDailyTaskForEdit(taskId: string, groupId: string) {
  const task = await prisma.dailyTask.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { userId: true } } },
  });
  if (!task || task.groupId !== groupId) return null;

  const input: CreateDailyTaskInput = {
    title: task.title,
    description: task.description ?? "",
    category: task.category,
    audienceAll: task.assignAllMembers,
    memberIds: task.assignees.map((a) => a.userId),
    frequency: task.frequency,
    weekdays: task.weekdays,
    // The form's date input speaks "YYYY-MM-DD"; startDate is stored as
    // UTC-midnight of a Vietnam calendar day, so read it back through the
    // UTC getters rather than the local ones.
    startDate: `${task.startDate.getUTCFullYear()}-${String(task.startDate.getUTCMonth() + 1).padStart(2, "0")}-${String(task.startDate.getUTCDate()).padStart(2, "0")}`,
    dueTime: task.dueTime,
    requireExplanation: task.requireExplanation,
    points: task.points,
  };
  return { task, input };
}

// Shared validation + Prisma.DailyTaskCreateInput shaping for "Soạn nhiệm vụ
// mới" — called by both createDailyTaskAction (the group's own LEADER/
// DEPUTY) and adminCreateDailyTaskAction (an admin managing any group); only
// the caller's authorization check differs, not this logic. Returns the input
// error message on failure so both call sites can just `return` whatever this
// gives back, matching this app's `string | undefined` action error
// convention.
export async function validateAndBuildDailyTaskData(
  groupId: string,
  input: CreateDailyTaskInput,
  createdById: string
): Promise<{ error: string } | { data: Prisma.DailyTaskCreateInput }> {
  const shared = validateSharedTaskFields(input);
  if ("error" in shared) return shared;
  const audience = await validateTaskAudience(groupId, input);
  if ("error" in audience) return audience;

  return {
    data: {
      ...shared.fields,
      group: { connect: { id: groupId } },
      assignAllMembers: input.audienceAll,
      createdBy: { connect: { id: createdById } },
      assignees: input.audienceAll
        ? undefined
        : { create: audience.memberIds.map((userId) => ({ userId })) },
    },
  };
}

// Same two halves, validated the same way, but shaped for an edit of a task
// that already exists. The assignee rows are handed back rather than nested
// into the update: switching a task from "cả nhóm" to a named subset (or
// between two different subsets) has to clear the old DailyTaskAssignee rows
// first, and the caller does that in the same batched transaction as the
// update so the two can never half-apply.
export type ValidatedTaskEdit = {
  data: Prisma.DailyTaskUpdateInput;
  assigneeUserIds: string[];
};

export async function validateAndBuildDailyTaskEdit(
  groupId: string,
  input: CreateDailyTaskInput
): Promise<{ error: string } | { edit: ValidatedTaskEdit }> {
  const shared = validateSharedTaskFields(input);
  if ("error" in shared) return shared;
  const audience = await validateTaskAudience(groupId, input);
  if ("error" in audience) return audience;

  return {
    edit: {
      data: { ...shared.fields, assignAllMembers: input.audienceAll },
      assigneeUserIds: input.audienceAll ? [] : audience.memberIds,
    },
  };
}

// Shared fields only — a bulk assignment always targets whole groups, so an
// edit of the whole batch never touches audience. Used with updateMany across
// every sibling copy.
export function validateBulkDailyTaskEdit(
  input: CreateDailyTaskInput
): { error: string } | { data: SharedTaskFields } {
  const shared = validateSharedTaskFields(input);
  if ("error" in shared) return shared;
  return { data: shared.fields };
}

// Loads a task only if it really sits in `groupId`. Both the admin actions
// and the leadership ones funnel through this: MANAGE_GROUPS already covers
// every group, and a leader is already pinned to theirs, so this isn't the
// privilege check — it stops a stale or hand-crafted task id from mutating a
// different group's task and revalidating the wrong page.
export async function findTaskInGroup(taskId: string, groupId: string) {
  const task = await prisma.dailyTask.findUnique({
    where: { id: taskId },
    select: { id: true, groupId: true, batchId: true, title: true },
  });
  return task && task.groupId === groupId ? task : null;
}

export type BulkDailyTaskPlan = {
  batchId: string;
  rows: Prisma.DailyTaskCreateManyInput[];
  groupCount: number;
  memberCount: number;
};

// "Giao việc hàng loạt": one task the admin composed once, materialised as
// one DailyTask per selected group, all sharing a freshly minted batchId
// (see the column comment in schema.prisma for why copies rather than a
// many-to-many).
//
// Bulk assignment is always the group's whole live membership —
// assignAllMembers, never DailyTaskAssignee rows. Picking individual people
// across several groups at once is a different, much fiddlier job that stays
// on the per-group form; and going through the group keeps the audience
// live, so whoever joins tomorrow picks the task up automatically. Because
// no assignee rows are needed, the copies go in with a single createMany.
export async function validateAndBuildBulkDailyTaskData(
  groupIds: string[],
  input: CreateDailyTaskInput,
  createdById: string
): Promise<{ error: string } | { plan: BulkDailyTaskPlan }> {
  const uniqueIds = Array.from(new Set(groupIds));
  if (uniqueIds.length === 0) return { error: "Vui lòng chọn ít nhất một nhóm nhận nhiệm vụ." };

  const shared = validateSharedTaskFields(input);
  if ("error" in shared) return shared;

  const groups = await prisma.group.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, _count: { select: { memberships: true } } },
    orderBy: { name: "asc" },
  });
  if (groups.length !== uniqueIds.length) {
    return { error: "Một số nhóm được chọn không còn tồn tại — hãy tải lại trang." };
  }

  // A task assigned to nobody is invisible: no audience, so no completion
  // rows, so it never shows up as outstanding anywhere. Refuse rather than
  // create silent dead rows.
  const empty = groups.filter((g) => g._count.memberships === 0);
  if (empty.length > 0) {
    const names = empty.map((g) => `"${g.name}"`).join(", ");
    return { error: `Nhóm ${names} chưa có thành viên nào nên không thể nhận nhiệm vụ.` };
  }

  const batchId = randomUUID();
  return {
    plan: {
      batchId,
      rows: groups.map((group) => ({
        ...shared.fields,
        groupId: group.id,
        batchId,
        assignAllMembers: true,
        createdById,
      })),
      groupCount: groups.length,
      memberCount: groups.reduce((sum, g) => sum + g._count.memberships, 0),
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
