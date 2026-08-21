// Pure logic/constants for "Nhóm của tôi" — no Prisma import, safe to use
// from both Server and Client Components (see src/lib/levels.ts for the
// same split convention). DB-touching helpers live in src/lib/group-data.ts.
import type { DailyTask, DailyTaskCategory, DailyTaskFrequency, GroupRole, PersonalityTestType } from "@prisma/client";

// Shared shape for "Soạn nhiệm vụ mới", submitted by both the leader
// self-service form (/dashboard/my-group/tasks/new) and the admin form
// (/admin/groups/[groupId]/tasks/new) — see CreateTaskForm in
// src/components/groups/create-task-form.tsx, which both routes reuse.
export type CreateDailyTaskInput = {
  title: string;
  description: string;
  category: DailyTaskCategory;
  audienceAll: boolean;
  memberIds: string[];
  frequency: DailyTaskFrequency;
  weekdays: number[];
  startDate: string; // "YYYY-MM-DD"
  dueTime: string; // "HH:MM"
  requireExplanation: boolean;
  points: number;
};

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  LEADER: "Trưởng nhóm",
  DEPUTY: "Phó nhóm",
  MEMBER: "Thành viên",
};

export const GROUP_LEADERSHIP_ROLES: GroupRole[] = ["LEADER", "DEPUTY"];

export function isGroupLeadership(role: GroupRole): boolean {
  return GROUP_LEADERSHIP_ROLES.includes(role);
}

// A group's own LEADER/DEPUTY manages the tasks they authored themselves,
// but never the ones an admin broadcast to several groups at once — those
// carry a batchId (see the column comment in schema.prisma) and belong to
// the admin who sent them, so a single group can't quietly opt itself out
// of a company-wide assignment. Admins reach every task either way through
// /admin/groups. Keep this the single source of truth: any future
// leadership-side edit/delete of a DailyTask must gate on it.
export function isTaskManageableByLeadership(task: Pick<DailyTask, "batchId">): boolean {
  return task.batchId === null;
}

// Group weekly scores are an average per member (see
// getGroupWeeklyPointsRanking), so they're rarely whole numbers. One decimal
// is enough precision to break ties visibly, and a trailing ",0" is noise —
// 34 stays "34", 21.93 becomes "21,9", using the Vietnamese decimal comma.
export function formatPointsVN(points: number): string {
  const rounded = Math.round(points * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

export const DAILY_TASK_CATEGORY_LABELS: Record<DailyTaskCategory, string> = {
  CALL: "Gọi điện",
  READING: "Đọc sách",
  EXERCISE: "Thể dục",
  NOTE: "Ghi chép",
  OTHER: "Khác",
};

export const ORDERED_DAILY_TASK_CATEGORIES: DailyTaskCategory[] = ["CALL", "READING", "EXERCISE", "NOTE", "OTHER"];

export const DAILY_TASK_FREQUENCY_LABELS: Record<DailyTaskFrequency, string> = {
  ONCE: "Chỉ hôm nay",
  DAILY: "Lặp lại mỗi ngày",
  WEEKLY_DAYS: "Lặp theo các thứ trong tuần",
};

// ISO weekday numbers (1=Monday..7=Sunday), matching DailyTask.weekdays.
export const ORDERED_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_LABELS: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

export const ORDERED_PERSONALITY_TEST_TYPES: PersonalityTestType[] = ["DISC", "MBTI", "IQ", "EQ"];
export const PERSONALITY_TEST_LABELS: Record<PersonalityTestType, string> = {
  DISC: "DISC",
  MBTI: "MBTI",
  IQ: "IQ",
  EQ: "EQ",
};

// This app has no other timezone-aware date handling (dateOfBirth etc. all
// take the server process's local date as-is) — but "today" for a daily
// check-in/streak/task feature specifically must follow Vietnam's calendar
// day regardless of which UTC region the server runs in (Vercel functions
// run in UTC), or the day would roll over at 7am local time instead of
// midnight. All Date objects returned here are UTC-midnight of the
// corresponding Vietnam calendar day — this is what gets written to/compared
// against every `@db.Date` column in the Group/DailyTask/CheckIn models.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function todayVN(): Date {
  const vn = new Date(Date.now() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

export function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

// Monday of the ISO week containing `d`.
export function getWeekStart(d: Date): Date {
  const date = dateOnly(d);
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function formatDateVN(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// The Vietnam calendar day a real *instant* falls on. dateOnly() above is for
// @db.Date columns, which are already stored as UTC-midnight of the VN day;
// this one is for true timestamps (Order.paymentDeadline, for instance),
// which still need the offset applied before the day can be read off. Feed
// the result to formatDateVN to print it.
export function dateOnlyVN(d: Date): Date {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

// "HH:MM" — the clock time of an instant in Vietnam, for a server that runs
// in UTC. Sibling of isPastTimeOfDayVN below, which compares against *now*.
export function formatTimeVN(d: Date): string {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return `${String(vn.getUTCHours()).padStart(2, "0")}:${String(vn.getUTCMinutes()).padStart(2, "0")}`;
}

export function isSameDate(a: Date, b: Date): boolean {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

// JS Date.getUTCDay() is 0=Sun..6=Sat; DailyTask.weekdays is ISO 1=Mon..7=Sun.
const JS_DAY_TO_ISO_WEEKDAY = [7, 1, 2, 3, 4, 5, 6];

// Whether `task` is assigned on `date` at all, independent of who it's
// assigned to (see getTaskAudienceUserIds in group-data.ts for the "who").
export function isTaskLiveOnDate(
  task: Pick<DailyTask, "frequency" | "startDate" | "weekdays">,
  date: Date
): boolean {
  const day = dateOnly(date);
  const start = dateOnly(task.startDate);
  if (day.getTime() < start.getTime()) return false;
  switch (task.frequency) {
    case "ONCE":
      return day.getTime() === start.getTime();
    case "DAILY":
      return true;
    case "WEEKLY_DAYS":
      return task.weekdays.includes(JS_DAY_TO_ISO_WEEKDAY[day.getUTCDay()]);
  }
}

export function isPastTimeOfDayVN(hhmm: string): boolean {
  const [h, m] = hhmm.split(":").map(Number);
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);
  const minutesNow = nowVN.getUTCHours() * 60 + nowVN.getUTCMinutes();
  return minutesNow >= h * 60 + m;
}

export type SpinRewardLike = { weightPercent: number };

// Weighted random pick — `rewards` should sum to 100 (validated in the
// admin UI, not enforced here); if it doesn't, this still degrades
// gracefully by treating the sum as 100% of *something*.
export function pickWeightedReward<T extends SpinRewardLike>(rewards: T[]): T {
  const totalWeight = rewards.reduce((sum, r) => sum + Math.max(0, r.weightPercent), 0);
  if (totalWeight <= 0) return rewards[0];
  let roll = Math.random() * totalWeight;
  for (const reward of rewards) {
    roll -= Math.max(0, reward.weightPercent);
    if (roll <= 0) return reward;
  }
  return rewards[rewards.length - 1];
}

export const BASE_SPINS_PER_DAY = 2;

// Pure streak computation over already-fetched check-in dates (epoch ms,
// each truncated via dateOnly, sorted descending — most recent first).
// Kept separate from the DB read in group-data.ts's computeCheckInStreaks
// specifically so it's unit-testable without a database.
export function computeStreaksFromDates(dates: number[], today: number): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 };
  const oneDay = 24 * 60 * 60 * 1000;

  // A streak isn't broken until a full calendar day is skipped — checking
  // in yesterday but not yet today still counts as a live streak.
  let current = 0;
  if (dates[0] === today || dates[0] === today - oneDay) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i - 1] - dates[i] !== oneDay) break;
      current++;
    }
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    run = dates[i - 1] - dates[i] === oneDay ? run + 1 : 1;
    if (run > best) best = run;
  }

  return { current, best: Math.max(best, current) };
}

/**
 * Standard competition ranking: everyone on the same score shares one rank
 * (1, 2, 2, 4). Deliberately not "position in the sorted array", which is what
 * /dashboard/my-group used to do — with most of a group sitting on 0 points,
 * that handed out ranks in whatever arbitrary order the rows came back in, so
 * two members with identical scores read different numbers. The overview strip
 * on /dashboard and the group page both rank through here now.
 *
 * Lives here rather than beside the leaderboard query in group-data.ts for the
 * same reason computeStreaksFromDates does: it is pure, so it can be tested
 * without a database.
 */
export function rankByPoints(allPoints: number[], myPoints: number): number {
  return allPoints.filter((points) => points > myPoints).length + 1;
}

// Rotates by calendar day (Vietnam time), not stored in the DB — no admin
// screen ever asked for editing these, so a small fixed pool kept as plain
// code is simpler than a one-row-per-day content model for a purely
// decorative "câu châm ngôn hôm nay" line.
const DAILY_QUOTES: string[] = [
  "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.",
  "Thành công là tổng của những nỗ lực nhỏ lặp lại mỗi ngày.",
  "Đừng đợi cơ hội, hãy tự tạo ra nó.",
  "Người kiên trì không phải là người không vấp ngã, mà là người luôn đứng dậy.",
  "Một hành động nhỏ hôm nay tốt hơn một kế hoạch hoàn hảo chưa từng bắt đầu.",
  "Bạn không cần phải giỏi để bắt đầu, nhưng phải bắt đầu để giỏi.",
  "Mỗi ngày là một cơ hội để trở thành phiên bản tốt hơn của chính mình.",
];

export function getQuoteForToday(date: Date = todayVN()): string {
  const dayOfEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  const index = ((dayOfEpoch % DAILY_QUOTES.length) + DAILY_QUOTES.length) % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
