import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveSuperAdmin } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin-permissions";
import { formatDateVN } from "@/lib/date";

export default async function AdminsPage() {
  await requireActiveSuperAdmin();

  const admins = await prisma.user.findMany({
    where: { role: "STUDENT", adminPermissions: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      adminOnly: true,
      createdAt: true,
      adminPermissions: { select: { permission: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Admin"
        description="Toàn bộ tài khoản đang có quyền admin — chuyên trách một hoặc nhiều tính năng thay vì Super Admin toàn hệ thống."
        actions={
          <Link
            href="/admin/admins/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm admin
          </Link>
        }
      />

      {admins.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Chưa có admin nào được phân quyền chuyên biệt.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <Link
              key={admin.id}
              href={`/admin/admins/${admin.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                  <Badge color={admin.adminOnly ? "warning" : "muted"}>
                    {admin.adminOnly ? "Chỉ admin" : "Học viên + Admin"}
                  </Badge>
                  <StatusBadge status={admin.status} />
                </div>
                <p className="truncate text-xs text-muted">{admin.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {admin.adminPermissions.map(({ permission }) => (
                    <Badge key={permission} color="primary">
                      {ADMIN_PERMISSION_LABELS[permission]}
                    </Badge>
                  ))}
                </div>
              </div>
              <span className="hidden shrink-0 text-xs text-muted sm:block">
                Tạo lúc {formatDateVN(admin.createdAt)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
