import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CreateTaskForm } from "@/components/groups/create-task-form";
import { adminCreateDailyTaskAction } from "../../../actions";

export default async function AdminNewDailyTaskPage({ params }: { params: Promise<{ groupId: string }> }) {
  const admin = await requireAdminPermission("MANAGE_GROUPS");
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  if (!group) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <BackLink href={`/admin/groups/${groupId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Soạn nhiệm vụ mới</h1>
        <p className="mt-1 text-sm text-muted">Giao việc cho {group.name}</p>
      </div>
      <CreateTaskForm
        members={group.memberships.map((m) => ({ id: m.userId, name: m.user.name }))}
        groupName={group.name}
        creatorName={admin.name}
        action={adminCreateDailyTaskAction.bind(null, groupId)}
        successHref={`/admin/groups/${groupId}`}
      />
    </div>
  );
}
