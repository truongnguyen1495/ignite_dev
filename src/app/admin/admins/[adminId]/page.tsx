import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveSuperAdmin } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { LEVEL_LABELS } from "@/lib/levels";
import { formatDateTimeVN } from "@/lib/date";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin-permissions";
import { AdminPermissionEditor } from "./admin-permission-editor";
import { ToggleAdminStatusButton, DeleteAdminAccountButton } from "./danger-actions";

export default async function AdminDetailPage({ params }: { params: Promise<{ adminId: string }> }) {
  await requireActiveSuperAdmin();
  const { adminId } = await params;

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    include: {
      adminPermissions: {
        include: { grantedBy: { select: { name: true } } },
        orderBy: { grantedAt: "desc" },
      },
    },
  });
  if (!admin || admin.role !== "STUDENT") {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/admin/admins">Quay lại</BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{admin.name}</h1>
          <Badge color={admin.adminOnly ? "warning" : "muted"}>
            {admin.adminOnly ? "Chỉ admin" : "Học viên + Admin"}
          </Badge>
          <StatusBadge status={admin.status} />
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Email</dt>
            <dd className="break-words text-foreground">{admin.email}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Username</dt>
            <dd className="break-words text-foreground">{admin.username ? `@${admin.username}` : "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Số điện thoại</dt>
            <dd className="break-words text-foreground">{admin.phoneNumber ?? "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Cấp học viên</dt>
            <dd className="text-foreground">
              {admin.grantedLevel ? LEVEL_LABELS[admin.grantedLevel] : "Học sinh"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Ngày tạo</dt>
            <dd className="text-foreground">{formatDateTimeVN(admin.createdAt)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Cập nhật lần cuối</dt>
            <dd className="text-foreground">{formatDateTimeVN(admin.updatedAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Quyền admin</h2>
        <AdminPermissionEditor
          adminId={admin.id}
          initialAdminOnly={admin.adminOnly}
          initialPermissions={admin.adminPermissions.map((p) => p.permission)}
        />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Lịch sử cấp quyền</h2>
        {admin.adminPermissions.length === 0 ? (
          <p className="text-sm text-muted">Chưa có quyền nào được cấp.</p>
        ) : (
          <ul className="space-y-2">
            {admin.adminPermissions.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <span className="font-medium text-foreground">{ADMIN_PERMISSION_LABELS[p.permission]}</span>
                <span className="text-xs text-muted">
                  Cấp bởi {p.grantedBy.name} · {formatDateTimeVN(p.grantedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleAdminStatusButton adminId={admin.id} locked={admin.status === "LOCKED"} />
          {admin.adminOnly && <DeleteAdminAccountButton adminId={admin.id} adminName={admin.name} />}
        </div>
      </Card>
    </div>
  );
}
