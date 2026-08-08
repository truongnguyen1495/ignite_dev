import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users, Brain, Gift } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDateVN, getWeekStart, isTaskLiveOnDate, todayVN } from "@/lib/groups";
import {
  getGroupTodayCompletionStats,
  getGroupWeeklyPointsRanking,
  getTaskAudienceUserIds,
} from "@/lib/group-data";
import { TabsShell } from "@/components/ui/tabs-shell";
import { ExplanationCard } from "@/components/groups/explanation-card";
import { adminReviewExplanationAction } from "../actions";
import { MembersPanel, type MemberRow } from "./members-panel";

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  await requireAdminPermission("MANAGE_GROUPS");
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  if (!group) notFound();

  const memberIds = group.memberships.map((m) => m.userId);
  const today = todayVN();
  const weekStart = getWeekStart(today);

  const [
    otherGroups,
    unassignedStudents,
    checkInsToday,
    tasks,
    pendingExplanations,
    completionStats,
    weeklyRanking,
    resultRows,
    spinRewardCount,
  ] = await Promise.all([
    prisma.group.findMany({ where: { id: { not: groupId } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "STUDENT", adminOnly: false, groupMembership: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    memberIds.length
      ? prisma.checkIn.findMany({ where: { userId: { in: memberIds }, date: today }, select: { userId: true } })
      : Promise.resolve([]),
    prisma.dailyTask.findMany({ where: { groupId }, orderBy: { createdAt: "desc" } }),
    prisma.dailyTaskCompletion.findMany({
      where: { status: "EXPLAINED_PENDING", task: { groupId } },
      include: { task: true, user: true },
      orderBy: { explainedAt: "asc" },
    }),
    getGroupTodayCompletionStats(groupId),
    getGroupWeeklyPointsRanking(weekStart),
    memberIds.length
      ? prisma.personalityResult.findMany({ where: { userId: { in: memberIds } }, select: { userId: true }, distinct: ["userId"] })
      : Promise.resolve([]),
    prisma.spinReward.count(),
  ]);

  const checkedInIds = new Set(checkInsToday.map((c) => c.userId));
  const memberRows: MemberRow[] = group.memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    grantedLevel: m.user.grantedLevel,
    checkedInToday: checkedInIds.has(m.userId),
  }));

  // A task's "today" progress only means something on a day it's actually
  // live (isTaskLiveOnDate) — a ONCE task shown days after its one due date,
  // or a WEEKLY_DAYS task on an "off" weekday, would otherwise always show
  // a stuck "0/N hoàn thành" (querying completions dated *today*, which
  // never exist for a day the task was never assignable on) even if
  // everyone completed it on the day it actually ran. Those fall back to a
  // lifetime completion count instead of a misleading today-only bar.
  const taskRows = await Promise.all(
    tasks.map(async (task) => {
      const audience = await getTaskAudienceUserIds(task);
      const isLiveToday = isTaskLiveOnDate(task, today);
      if (isLiveToday) {
        const doneCount = audience.length
          ? await prisma.dailyTaskCompletion.count({
              where: { taskId: task.id, date: today, userId: { in: audience }, status: "DONE" },
            })
          : 0;
        return { task, audienceSize: audience.length, doneCount, isLiveToday };
      }
      const lifetimeDoneCount = await prisma.dailyTaskCompletion.count({
        where: { taskId: task.id, status: "DONE" },
      });
      return { task, audienceSize: audience.length, doneCount: lifetimeDoneCount, isLiveToday };
    })
  );

  const groupRankIndex = weeklyRanking.findIndex((r) => r.groupId === groupId);
  const groupWeeklyPoints = groupRankIndex >= 0 ? weeklyRanking[groupRankIndex].totalPoints : 0;
  const completionPct = completionStats.total > 0 ? Math.round((completionStats.done / completionStats.total) * 100) : 0;
  const membersWithResultCount = resultRows.length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/groups" className="text-sm text-muted hover:text-foreground">
          ← Danh sách nhóm
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-foreground">
            <Users className="h-6 w-6 text-primary" />
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-muted">Tạo ngày {formatDateVN(group.createdAt)}</p>
        </div>
        <Link
          href={`/admin/groups/${group.id}/tasks/new`}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Giao việc mới
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={String(group.memberships.length)} label="Thành viên trong nhóm" />
        <StatTile value={`${completionPct}%`} label="Hoàn thành hôm nay" tone="success" />
        <StatTile value={String(pendingExplanations.length)} label="Giải trình chờ duyệt" tone="warning" />
        <StatTile
          value={`${groupWeeklyPoints}đ`}
          label={`Điểm nhóm tuần này${groupRankIndex >= 0 ? ` · hạng ${groupRankIndex + 1}/${weeklyRanking.length}` : ""}`}
        />
      </div>

      <TabsShell
        tabs={[
          {
            id: "members",
            label: "Thành viên",
            count: memberRows.length,
            content: (
              <MembersPanel
                groupId={group.id}
                members={memberRows}
                otherGroups={otherGroups}
                unassignedStudents={unassignedStudents}
              />
            ),
          },
          {
            id: "tasks",
            label: "Nhiệm vụ hàng ngày",
            count: taskRows.length,
            content: (
              <div className="space-y-1">
                {taskRows.length === 0 ? (
                  <p className="text-sm text-muted">Nhóm này chưa có nhiệm vụ nào.</p>
                ) : (
                  taskRows.map(({ task, audienceSize, doneCount, isLiveToday }) => (
                    <div key={task.id} className="flex flex-wrap items-center gap-4 border-t border-border py-3 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {task.title}
                          {task.frequency !== "ONCE" && (
                            <span className="ml-2 rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-[10px] font-bold text-info">
                              {task.frequency === "DAILY" ? "Lặp mỗi ngày" : "Lặp theo thứ"}
                            </span>
                          )}
                          {!isLiveToday && (
                            <span className="ml-2 rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-bold text-faint">
                              Không áp dụng hôm nay
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-faint">Bắt đầu {formatDateVN(task.startDate)}</p>
                      </div>
                      <div className="w-48 shrink-0">
                        {isLiveToday ? (
                          <>
                            <div className="h-1.5 overflow-hidden rounded-full bg-faint-bg">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${audienceSize ? Math.round((doneCount / audienceSize) * 100) : 0}%` }}
                              />
                            </div>
                            <p className="mt-1 text-right text-xs text-muted">
                              {doneCount}/{audienceSize} hoàn thành hôm nay
                            </p>
                          </>
                        ) : (
                          <p className="text-right text-xs text-muted">Đã hoàn thành {doneCount} lượt (tổng)</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ),
          },
          {
            id: "explanations",
            label: "Giải trình chờ duyệt",
            count: pendingExplanations.length,
            content: (
              <div className="space-y-3">
                {pendingExplanations.length === 0 ? (
                  <p className="text-sm text-muted">Không có giải trình nào đang chờ duyệt.</p>
                ) : (
                  pendingExplanations.map((completion) => (
                    <ExplanationCard
                      key={completion.id}
                      completionId={completion.id}
                      memberName={completion.user.name}
                      taskTitle={completion.task.title}
                      dateLabel={formatDateVN(completion.date)}
                      explanationText={completion.explanationText ?? ""}
                      action={adminReviewExplanationAction.bind(null, groupId)}
                    />
                  ))
                )}
              </div>
            ),
          },
          {
            id: "overview",
            label: "Trắc nghiệm & Mini-game",
            content: (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-bg text-primary">
                    <Brain className="h-4 w-4" />
                  </span>
                  <h4 className="text-sm font-bold text-foreground">Khám phá bản thân</h4>
                  <p className="text-sm text-muted">
                    {membersWithResultCount}/{memberRows.length} thành viên đã có ít nhất 1 kết quả trắc nghiệm.
                  </p>
                  <Link href="/admin/tests" className="text-sm font-semibold text-primary hover:underline">
                    Nhập / xem kết quả trắc nghiệm →
                  </Link>
                </div>
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-bg text-info">
                    <Gift className="h-4 w-4" />
                  </span>
                  <h4 className="text-sm font-bold text-foreground">Mini-game &amp; thưởng</h4>
                  <p className="text-sm text-muted">
                    {spinRewardCount} phần thưởng vòng quay đang cấu hình.{" "}
                    {memberRows.length === 0
                      ? "Nhóm chưa có thành viên nên chưa được xếp hạng."
                      : `Nhóm đang xếp hạng ${groupRankIndex + 1}/${weeklyRanking.length} toàn hệ thống tuần này.`}
                  </p>
                  <Link href="/admin/minigame" className="text-sm font-semibold text-primary hover:underline">
                    Xem bảng xếp hạng & trao thưởng →
                  </Link>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function StatTile({ value, label, tone }: { value: string; label: string; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
