import Link from "next/link";
import { AlertTriangle, Flame, Award, Target, Coins, Quote as QuoteIcon, Settings2, ClipboardCheck } from "lucide-react";
import { requireOwnGroupMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  GROUP_ROLE_LABELS,
  ORDERED_PERSONALITY_TEST_TYPES,
  PERSONALITY_TEST_LABELS,
  getQuoteForToday,
  getWeekStart,
  isGroupLeadership,
  todayVN,
} from "@/lib/groups";
import {
  computeCheckInStreaks,
  computeWeeklyPoints,
  countGoalCompletedDays,
  ensureCheckedInToday,
  getOrSeedPersonalityTests,
  getSpinsRemainingToday,
  getTodayTasksForUser,
  getWeeklyLeaderboard,
} from "@/lib/group-data";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TaskChecklist } from "./task-checklist";
import { SpinWheel } from "./spin-wheel";

export default async function MyGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { student, membership } = await requireOwnGroupMembership();
  const { denied } = await searchParams;

  // Visiting this page IS the check-in — no separate "check in" button, per
  // the product brief ("mỗi ngày vào kiểm tra"). Awaited before the streak
  // read below so today's visit is already reflected in the same request.
  await ensureCheckedInToday(student.id);

  const weekStart = getWeekStart(todayVN());

  const [
    streaks,
    goalDays,
    weeklyPoints,
    spinsRemaining,
    todayTasks,
    tests,
    results,
    spinRewards,
    groupLeaderboard,
    leaderMembership,
    deputyMembership,
  ] = await Promise.all([
    computeCheckInStreaks(student.id),
    countGoalCompletedDays(student.id),
    computeWeeklyPoints(student.id, weekStart),
    getSpinsRemainingToday(student.id),
    getTodayTasksForUser(student.id),
    getOrSeedPersonalityTests(),
    prisma.personalityResult.findMany({ where: { userId: student.id } }),
    prisma.spinReward.findMany({ orderBy: { order: "asc" } }),
    membership ? getWeeklyLeaderboard(weekStart, "GROUP", membership.groupId) : Promise.resolve([]),
    membership ? prisma.groupMembership.findFirst({ where: { groupId: membership.groupId, role: "LEADER" }, include: { user: true } }) : null,
    membership ? prisma.groupMembership.findFirst({ where: { groupId: membership.groupId, role: "DEPUTY" }, include: { user: true } }) : null,
  ]);

  const resultByTestId = new Map(results.map((r) => [r.testId, r]));
  const canManageGroup = membership ? isGroupLeadership(membership.role) : false;
  const myRank = groupLeaderboard.findIndex((e) => e.user.id === student.id) + 1;

  return (
    <div className="space-y-8">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn cần là trưởng nhóm hoặc phó nhóm để dùng chức năng đó.
        </p>
      )}
      {!membership && (
        <p className="rounded-lg border border-info-border bg-info-bg px-4 py-3 text-sm text-info">
          Bạn chưa được xếp vào nhóm nào — phần &quot;Hoạt động hàng ngày&quot; và bảng xếp hạng nhóm sẽ mở khi admin xếp
          bạn vào một nhóm. Bạn vẫn có thể check-in, làm trắc nghiệm và quay thưởng bình thường.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar src={student.avatarUrl} name={student.name} size={52} className="text-lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Dashboard cá nhân</p>
            <h1 className="text-2xl font-semibold text-foreground">Chào {student.name}</h1>
            {membership && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-bg px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {membership.group.name}
                </span>
                <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {GROUP_ROLE_LABELS[membership.role]}
                </span>
                {(leaderMembership || deputyMembership) && (
                  <span className="text-xs text-muted">
                    {leaderMembership && `Trưởng nhóm: ${leaderMembership.user.name}`}
                    {leaderMembership && deputyMembership && " · "}
                    {deputyMembership && `Phó nhóm: ${deputyMembership.user.name}`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {canManageGroup && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/my-group/tasks/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Settings2 className="h-4 w-4" /> Soạn nhiệm vụ mới
            </Link>
            <Link
              href="/dashboard/my-group/explanations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              <ClipboardCheck className="h-4 w-4" /> Giải trình chờ duyệt
            </Link>
          </div>
        )}
      </div>

      {/* Ghi nhận */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Ghi nhận</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={<Flame className="h-4 w-4" />} tone="accent" value={String(streaks.current)} label="Ngày check-in liên tiếp" />
          <StatTile icon={<Award className="h-4 w-4" />} tone="primary" value={String(streaks.best)} label="Kỷ lục check-in (best streak)" />
          <StatTile icon={<Target className="h-4 w-4" />} tone="success" value={String(goalDays)} label="Ngày hoàn thành mục tiêu" />
          <StatTile
            icon={<Coins className="h-4 w-4" />}
            tone="info"
            value={String(weeklyPoints)}
            label={`Điểm tích lũy tuần này${myRank > 0 ? ` · hạng ${myRank}` : ""}`}
          />
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-accent-border bg-accent-bg px-4 py-3">
          <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-hover" />
          <div>
            <p className="text-sm italic text-foreground">&ldquo;{getQuoteForToday()}&rdquo;</p>
            <p className="mt-0.5 text-xs font-semibold text-accent-hover">Câu châm ngôn hôm nay</p>
          </div>
        </div>
      </section>

      {/* Hoạt động hàng ngày */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Hoạt động hàng ngày</h2>
        {membership ? (
          <TaskChecklist tasks={todayTasks} />
        ) : (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
            Bạn chưa thuộc nhóm nào nên chưa có nhiệm vụ hàng ngày.
          </p>
        )}
      </section>

      {/* Khám phá bản thân */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Khám phá bản thân</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDERED_PERSONALITY_TEST_TYPES.map((type) => {
            const test = tests.find((t) => t.type === type);
            const result = test ? resultByTestId.get(test.id) : undefined;
            return (
              <div key={type} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      result ? "border border-success-border bg-success-bg text-success" : "border border-border-strong bg-faint-bg text-muted"
                    }`}
                  >
                    {result ? "Đã có kết quả" : "Chưa có kết quả"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{PERSONALITY_TEST_LABELS[type]}</h4>
                <p className="text-xs text-faint">
                  {test?.estimatedMinutes ? `~${test.estimatedMinutes} phút` : ""}
                  {test?.estimatedMinutes && test?.questionCount ? " · " : ""}
                  {test?.questionCount ? `${test.questionCount} câu hỏi` : ""}
                </p>
                {result ? (
                  <>
                    <p className="rounded-lg bg-primary-bg px-2.5 py-1.5 text-xs font-semibold text-primary">
                      {result.resultLabel}
                    </p>
                    <p className="mt-auto text-[11px] text-faint">
                      Admin cập nhật ngày {new Date(result.enteredAt).toLocaleDateString("vi-VN")}
                    </p>
                  </>
                ) : (
                  <p className="mt-auto text-[11px] italic text-faint">
                    Trưởng nhóm/Admin sẽ cập nhật kết quả tại đây sau khi bạn làm bài.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Mini-game */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Mini-game</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SpinWheel rewards={spinRewards} spinsRemaining={spinsRemaining} />
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Bảng xếp hạng tuần {membership ? `— ${membership.group.name}` : ""}
            </h3>
            {!membership ? (
              <p className="text-sm text-muted">Bạn cần được xếp vào nhóm để xem bảng xếp hạng nhóm.</p>
            ) : groupLeaderboard.length === 0 ? (
              <p className="text-sm text-muted">Chưa có dữ liệu tuần này.</p>
            ) : (
              <ul className="space-y-1">
                {groupLeaderboard.slice(0, 5).map((entry, i) => (
                  <li
                    key={entry.user.id}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                      entry.user.id === student.id ? "bg-primary-bg" : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        i === 0
                          ? "bg-accent-bg text-accent-hover"
                          : i === 1
                            ? "bg-faint-bg text-muted"
                            : i === 2
                              ? "bg-warning-bg text-warning"
                              : "bg-faint-bg text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-semibold text-foreground">
                      {entry.user.name}
                      {entry.user.id === student.id && <span className="ml-1 font-medium text-muted">(Bạn)</span>}
                    </span>
                    <span className="font-bold text-foreground">{entry.points}đ</span>
                  </li>
                ))}
                {myRank > 5 && (
                  <li className="flex items-center gap-2.5 rounded-lg bg-primary-bg px-2 py-1.5 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-faint-bg text-[11px] font-bold text-muted">
                      {myRank}
                    </span>
                    <span className="flex-1 truncate font-semibold text-foreground">
                      {student.name} <span className="font-medium text-muted">(Bạn)</span>
                    </span>
                    <span className="font-bold text-foreground">{weeklyPoints}đ</span>
                  </li>
                )}
              </ul>
            )}
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              Top 3 mỗi tuần nhận thưởng — trưởng nhóm và admin công bố & trao thưởng vào thứ Hai tuần sau.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: "accent" | "primary" | "success" | "info";
  value: string;
  label: string;
}) {
  const toneClasses = {
    accent: "bg-accent-bg text-accent-hover",
    primary: "bg-primary-bg text-primary",
    success: "bg-success-bg text-success",
    info: "bg-info-bg text-info",
  } as const;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>{icon}</span>
      <span className="text-2xl font-bold leading-none text-foreground">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
