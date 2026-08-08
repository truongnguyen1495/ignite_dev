import { BackLink } from "@/components/ui/back-link";
import { requireOwnGroupLeadership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CreateTaskForm } from "@/components/groups/create-task-form";
import { createDailyTaskAction } from "../../actions";

export default async function NewDailyTaskPage() {
  const { student, membership } = await requireOwnGroupLeadership();

  const members = await prisma.groupMembership.findMany({
    where: { groupId: membership.groupId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <BackLink href="/dashboard/my-group">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Soạn nhiệm vụ mới</h1>
        <p className="mt-1 text-sm text-muted">Giao việc cho {membership.group.name}</p>
      </div>
      <CreateTaskForm
        members={members.map((m) => ({ id: m.userId, name: m.user.name }))}
        groupName={membership.group.name}
        creatorName={student.name}
        action={createDailyTaskAction}
        successHref="/dashboard/my-group"
      />
    </div>
  );
}
