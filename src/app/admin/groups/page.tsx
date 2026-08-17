import Link from "next/link";
import { AlertTriangle, CalendarCheck, CheckCircle2, ClipboardList, Plus, Users } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { formatDateVN, todayVN } from "@/lib/groups";
import { getGroupsOverview } from "@/lib/group-data";
import { PageHeader } from "@/components/ui/page-header";
import { GroupsExplorer, type GroupCard } from "./groups-explorer";

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

export default async function GroupsListPage({
  searchParams,
}: {
  searchParams: Promise<{ assigned?: string; members?: string }>;
}) {
  await requireAdminPermission("MANAGE_GROUPS");

  const [overview, { assigned, members: assignedMembers }] = await Promise.all([
    getGroupsOverview(),
    searchParams,
  ]);

  const cards: GroupCard[] = overview.groups.map((group) => ({
    id: group.id,
    name: group.name,
    // Formatted here rather than in the Client Component so both views agree
    // on the Vietnam-calendar rendering the rest of the feature uses.
    createdAtLabel: formatDateVN(group.createdAt),
    createdAtMs: group.createdAt.getTime(),
    memberCount: group.memberCount,
    previewMembers: group.previewMembers,
    leaderName: group.leaderName,
    deputyCount: group.deputyCount,
    todayTotal: group.todayTotal,
    todayDone: group.todayDone,
    pendingExplanations: group.pendingExplanations,
    totalPoints: group.totalPoints,
    averagePoints: group.averagePoints,
    rank: group.rank,
  }));

  const todayPercent =
    overview.todayTotal > 0 ? Math.round((overview.todayDone / overview.todayTotal) * 100) : 0;
  const assignedCount = Number(assigned);
  const showAssignedBanner = Number.isInteger(assignedCount) && assignedCount > 0;

  return (
    <div className="space-y-5">
      {/* todayVN(), not new Date(): formatDateVN reads UTC fields, so between
          midnight and 07:00 Vietnam time a raw `new Date()` prints yesterday —
          the same rule every other date in this feature follows. */}
      <PageHeader
        title="Danh sách nhóm"
        description={`${overview.groups.length} nhóm · cập nhật ${formatDateVN(todayVN())}`}
        actions={
          <>
            <Link
              href="/admin/groups/assign"
              className="flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <CalendarCheck className="h-4 w-4" />
              Giao việc hàng loạt
            </Link>
            <Link
              href="/admin/groups/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Tạo nhóm mới
            </Link>
          </>
        }
      />

      {showAssignedBanner && (
        <p className="flex items-center gap-2 rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          Đã giao nhiệm vụ cho <strong className="font-bold">{assignedCount} nhóm</strong>
          {Number(assignedMembers) > 0 && (
            <>
              {" — "}
              <strong className="font-bold">{Number(assignedMembers)} thành viên</strong> nhận được.
            </>
          )}
        </p>
      )}

      {overview.groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Chưa có nhóm nào. Bấm &ldquo;Tạo nhóm mới&rdquo; để bắt đầu.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={<Users className="h-4 w-4" />}
              label="Nhóm"
              value={String(overview.groups.length)}
              note={`${overview.activeGroups} nhóm đang chạy nhiệm vụ`}
            />
            <StatTile
              icon={<Users className="h-4 w-4" />}
              label="Thành viên trong nhóm"
              value={`${overview.membersInGroups}`}
              valueSuffix={`/ ${overview.totalStudents}`}
              note={
                overview.unassignedStudents > 0
                  ? `Còn ${overview.unassignedStudents} chưa được xếp nhóm`
                  : "Tất cả thành viên đều đã có nhóm"
              }
            />
            <StatTile
              icon={<ClipboardList className="h-4 w-4" />}
              label="Hoàn thành hôm nay"
              value={overview.todayTotal > 0 ? `${todayPercent}%` : "—"}
              tone="success"
              note={
                overview.todayTotal > 0
                  ? `${overview.todayDone}/${overview.todayTotal} lượt nhiệm vụ`
                  : "Hôm nay chưa nhóm nào có nhiệm vụ"
              }
              meterPercent={overview.todayTotal > 0 ? todayPercent : undefined}
            />
            <StatTile
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Giải trình chờ duyệt"
              value={String(overview.pendingExplanations)}
              tone={overview.pendingExplanations > 0 ? "warning" : undefined}
              note={
                overview.oldestPendingExplainedAt
                  ? `Sớm nhất đã chờ ${daysSince(overview.oldestPendingExplainedAt)} ngày`
                  : "Không có giải trình nào đang chờ"
              }
            />
          </div>

          {(overview.groupsWithoutLeader > 0 || overview.unassignedStudents > 0) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-dashed border-warning-border bg-warning-bg px-4 py-3 text-sm text-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              {overview.groupsWithoutLeader > 0 && (
                <span>
                  <strong className="font-bold">{overview.groupsWithoutLeader} nhóm</strong> chưa có trưởng nhóm.
                </span>
              )}
              {overview.unassignedStudents > 0 && (
                <>
                  {overview.groupsWithoutLeader > 0 && <span className="text-faint">·</span>}
                  <span>
                    <strong className="font-bold">{overview.unassignedStudents} thành viên</strong> chưa được xếp vào
                    nhóm nào.
                  </span>
                  <Link href="/admin/students" className="ml-auto font-semibold text-warning hover:underline">
                    Xem danh sách thành viên →
                  </Link>
                </>
              )}
            </div>
          )}

          <GroupsExplorer groups={cards} />
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  valueSuffix,
  note,
  tone,
  meterPercent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: string;
  note: string;
  tone?: "success" | "warning";
  meterPercent?: number;
}) {
  const valueClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  const frameClass =
    tone === "warning" ? "border-warning-border bg-warning-bg" : "border-border bg-surface";

  return (
    <div className={`rounded-xl border p-4 ${frameClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        <span className={tone === "warning" ? "text-warning" : "text-faint"}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold leading-none ${valueClass}`}>
        {value}
        {valueSuffix && <span className="ml-1 text-sm font-medium text-muted">{valueSuffix}</span>}
      </div>
      {meterPercent !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-faint-bg">
          <div className="h-full rounded-full bg-success" style={{ width: `${meterPercent}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">{note}</p>
    </div>
  );
}
