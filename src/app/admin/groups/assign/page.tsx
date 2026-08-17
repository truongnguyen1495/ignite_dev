import { BackLink } from "@/components/ui/back-link";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CreateTaskForm } from "@/components/groups/create-task-form";
import { bulkCreateDailyTaskAction } from "../actions";

// One task composed once and sent to several groups at a time. Lives at a
// static sibling of /admin/groups/[groupId] (same shape as the existing
// /admin/groups/new) — a static segment wins over the dynamic one, and a
// group id is a cuid so it can never collide with "assign".
//
// `?groups=` carries the tick boxes the admin already checked on the list
// page, so the selection survives the navigation instead of having to be
// redone here.
export default async function BulkAssignTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ groups?: string }>;
}) {
  const admin = await requireAdminPermission("MANAGE_GROUPS");
  const { groups: preselectedParam } = await searchParams;

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { memberships: true } },
      // Just the leader's name for the picker's second line — not the roster.
      memberships: {
        where: { role: "LEADER" },
        select: { user: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const assignableCount = groups.filter((g) => g._count.memberships > 0).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <BackLink href="/admin/groups">Danh sách nhóm</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Giao việc hàng loạt</h1>
        <p className="mt-1 text-sm text-muted">
          Nhiệm vụ được tạo thành một bản riêng cho từng nhóm được chọn, nhưng cùng thuộc một đợt giao việc — về sau gỡ
          cả đợt chỉ trong một lần.
        </p>
      </div>

      {assignableCount === 0 ? (
        <p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-foreground">
          Chưa có nhóm nào có thành viên để giao việc. Hãy thêm thành viên vào nhóm trước.
        </p>
      ) : (
        <CreateTaskForm
          audience={{
            mode: "bulk",
            groups: groups.map((g) => ({
              id: g.id,
              name: g.name,
              memberCount: g._count.memberships,
              leaderName: g.memberships[0]?.user.name ?? null,
            })),
            preselectedGroupIds: preselectedParam ? preselectedParam.split(",").filter(Boolean) : [],
            action: bulkCreateDailyTaskAction,
          }}
          creatorName={admin.name}
        />
      )}
    </div>
  );
}
