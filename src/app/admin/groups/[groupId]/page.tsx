import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users, Brain, Gift } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDateVN, formatPointsVN, getWeekStart, todayVN } from "@/lib/groups";
import {
  getGroupTaskRows,
  getGroupTodayCompletionStats,
  getGroupWeeklyPointsRanking,
} from "@/lib/group-data";
import { TabsShell } from "@/components/ui/tabs-shell";
import { ExplanationCard } from "@/components/groups/explanation-card";
import { GroupTasksPanel } from "@/components/groups/group-tasks-panel";
import { adminReviewExplanationAction, deleteDailyTaskAction, deleteTaskBatchAction } from "../actions";
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
    taskRows,
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
    getGroupTaskRows(groupId),
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

  const groupRankIndex = weeklyRanking.findIndex((r) => r.groupId === groupId);
  const groupScore = groupRankIndex >= 0 ? weeklyRanking[groupRankIndex] : null;
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
        {/* Xếp hạng theo điểm trung bình mỗi người, không phải tổng thô — xem
            getGroupWeeklyPointsRanking. Tổng vẫn hiện ở nhãn để không mất thông tin. */}
        <StatTile
          value={`${formatPointsVN(groupScore?.averagePoints ?? 0)}đ`}
          label={`Điểm/người tuần này · tổng ${groupScore?.totalPoints ?? 0}đ${
            groupRankIndex >= 0 ? ` · hạng ${groupRankIndex + 1}/${weeklyRanking.length}` : ""
          }`}
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
              <GroupTasksPanel
                tasks={taskRows}
                editHrefBase={`/admin/groups/${group.id}/tasks`}
                deleteAction={deleteDailyTaskAction.bind(null, group.id)}
                deleteBatchAction={deleteTaskBatchAction.bind(null, group.id)}
                emptyText="Nhóm này chưa có nhiệm vụ nào."
              />
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
