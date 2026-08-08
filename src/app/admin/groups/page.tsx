import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";

export default async function GroupsListPage() {
  await requireAdminPermission("MANAGE_GROUPS");

  const groups = await prisma.group.findMany({
    include: { memberships: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Danh sách nhóm (${groups.length})`}
        actions={
          <Link
            href="/admin/groups/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Tạo nhóm mới
          </Link>
        }
      />

      {groups.length === 0 ? (
        <p className="text-sm text-muted">Chưa có nhóm nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-surface-hover text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Nhóm</th>
                <th className="px-4 py-3">Thành viên</th>
                <th className="px-4 py-3">Trưởng nhóm</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {groups.map((group) => {
                const leader = group.memberships.find((m) => m.role === "LEADER");
                return (
                  <tr key={group.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {group.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{group.memberships.length}</td>
                    <td className="px-4 py-3 text-muted">{leader ? leader.user.name : "Chưa có"}</td>
                    <td className="px-4 py-3 text-muted">{group.createdAt.toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/groups/${group.id}`} className="text-sm font-medium text-primary hover:underline">
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
