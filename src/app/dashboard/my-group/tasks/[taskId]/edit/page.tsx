import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { requireOwnGroupLeadership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isTaskManageableByLeadership } from "@/lib/groups";
import { getDailyTaskForEdit } from "@/lib/group-data";
import { CreateTaskForm } from "@/components/groups/create-task-form";
import { updateDailyTaskAction } from "../../../actions";

export default async function EditMyGroupTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { student, membership } = await requireOwnGroupLeadership();
  const { taskId } = await params;

  const found = await getDailyTaskForEdit(taskId, membership.groupId);
  if (!found) notFound();

  // The same rule updateDailyTaskAction enforces, applied one step earlier so
  // a leader never gets a form they can't submit. The action still re-checks —
  // this is a courtesy, not the gate.
  //
  // Answered in place rather than with redirect(): by the time this runs the
  // layout shell has already streamed, so a redirect degrades into a
  // meta-refresh the reader watches for a second. Saying why, right here, is
  // both faster and clearer than bouncing them to a banner on another page.
  if (!isTaskManageableByLeadership(found.task)) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <BackLink href="/dashboard/my-group/tasks">Nhiệm vụ của nhóm</BackLink>
        <div className="rounded-2xl border border-warning-border bg-warning-bg p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-bg text-warning">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mt-3 text-lg font-semibold text-foreground">Nhiệm vụ này do ban quản trị giao</h1>
          <p className="mt-1.5 text-sm text-muted">
            &ldquo;{found.task.title}&rdquo; được giao cho nhiều nhóm cùng lúc nên chỉ ban quản trị mới sửa hoặc gỡ
            được. Bạn vẫn theo dõi tiến độ và duyệt giải trình của nhiệm vụ này bình thường, và vẫn tự giao nhiệm vụ
            riêng cho nhóm mình.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/my-group/tasks"
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Về danh sách nhiệm vụ
            </Link>
            <Link
              href="/dashboard/my-group/tasks/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Soạn nhiệm vụ mới
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const members = await prisma.groupMembership.findMany({
    where: { groupId: membership.groupId },
    select: { userId: true, user: { select: { name: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <BackLink href="/dashboard/my-group/tasks">Nhiệm vụ của nhóm</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Sửa nhiệm vụ</h1>
        <p className="mt-1 text-sm text-muted">
          Thay đổi áp dụng từ giờ trở đi. Lịch sử hoàn thành đã ghi nhận vẫn giữ nguyên — nhưng nếu bạn đổi điểm
          thưởng, số điểm mới sẽ được tính lại cho cả những lượt đã hoàn thành trước đó.
        </p>
      </div>
      <CreateTaskForm
        audience={{
          mode: "single",
          groupName: membership.group.name,
          members: members.map((m) => ({ id: m.userId, name: m.user.name })),
          action: updateDailyTaskAction.bind(null, taskId),
        }}
        creatorName={student.name}
        initial={found.input}
        submitLabel="Lưu thay đổi"
        successHref="/dashboard/my-group/tasks"
      />
    </div>
  );
}
