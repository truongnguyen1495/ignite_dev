import Link from "next/link";
import { Plus } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { requireOwnGroupLeadership } from "@/lib/access";
import { getGroupTaskRows } from "@/lib/group-data";
import { GroupTasksPanel } from "@/components/groups/group-tasks-panel";
import { deleteDailyTaskAction } from "../actions";

// The group's own LEADER/DEPUTY managing what they assigned. Deliberately its
// own page rather than a section on /dashboard/my-group: that page is the
// member-facing daily view every student sees, and a management table would
// only ever apply to two of them.
export default async function MyGroupTasksPage() {
  const { membership } = await requireOwnGroupLeadership();
  const tasks = await getGroupTaskRows(membership.groupId);

  const fromAdminCount = tasks.filter((t) => t.batchId !== null).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <BackLink href="/dashboard/my-group">Quay lại</BackLink>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Nhiệm vụ của nhóm</h1>
            <p className="mt-1 text-sm text-muted">{membership.group.name}</p>
          </div>
          <Link
            href="/dashboard/my-group/tasks/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> Soạn nhiệm vụ mới
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <GroupTasksPanel
          tasks={tasks}
          editHrefBase="/dashboard/my-group/tasks"
          deleteAction={deleteDailyTaskAction}
          lockAdminTasks
          emptyText="Nhóm chưa có nhiệm vụ nào. Bấm “Soạn nhiệm vụ mới” để bắt đầu."
        />
      </div>

      {fromAdminCount > 0 && (
        <p className="text-xs text-muted">
          {fromAdminCount} nhiệm vụ trong danh sách do ban quản trị giao — bạn xem được tiến độ và duyệt giải trình,
          nhưng chỉ ban quản trị mới sửa hoặc gỡ được.
        </p>
      )}
    </div>
  );
}
