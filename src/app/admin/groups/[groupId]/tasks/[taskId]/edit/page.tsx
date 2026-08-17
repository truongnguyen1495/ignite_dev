import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getDailyTaskForEdit } from "@/lib/group-data";
import { AdminEditTaskForm } from "./edit-task-form";

export default async function AdminEditTaskPage({
  params,
}: {
  params: Promise<{ groupId: string; taskId: string }>;
}) {
  const admin = await requireAdminPermission("MANAGE_GROUPS");
  const { groupId, taskId } = await params;

  const found = await getDailyTaskForEdit(taskId, groupId);
  if (!found) notFound();

  const [group, members, batchGroupCount] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    found.task.batchId
      ? prisma.dailyTask.count({ where: { batchId: found.task.batchId } })
      : Promise.resolve(0),
  ]);
  if (!group) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <BackLink href={`/admin/groups/${groupId}`}>Quay lại {group.name}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Sửa nhiệm vụ</h1>
        <p className="mt-1 text-sm text-muted">
          Thay đổi áp dụng từ giờ trở đi. Lịch sử hoàn thành đã ghi nhận vẫn giữ nguyên — nhưng nếu đổi điểm thưởng, số
          điểm mới sẽ được tính lại cho cả những lượt đã hoàn thành trước đó.
        </p>
      </div>

      <AdminEditTaskForm
        groupId={groupId}
        taskId={taskId}
        groupName={group.name}
        members={members.map((m) => ({ id: m.userId, name: m.user.name }))}
        creatorName={admin.name}
        initial={found.input}
        batchId={found.task.batchId}
        batchGroupCount={batchGroupCount}
      />
    </div>
  );
}
