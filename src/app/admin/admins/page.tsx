import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminManagementAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin-permissions";
import { formatDateVN } from "@/lib/date";
import { RevokeAllPermissionsButton } from "./revoke-all-permissions-button";
import { RestorePermissionsButton } from "./restore-permissions-button";

export default async function AdminsPage() {
  const { isSuperAdmin } = await requireAdminManagementAccess();

  const admins = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      // An Admin Manager's full access never comes from AdminPermission rows
      // (see hasFullAdminAccess in src/lib/access.ts) — isAdminManager alone
      // must list them here too, or a designated Admin Manager with zero
      // rows would be invisible on this page. An Admin Manager caller must
      // not even see other Admin Managers, same boundary as the actions.
      //
      // revokedAt: null (not just "some row exists") — once every permission
      // is revoked (RemoveAdminRoleButton/RevokeAllPermissionsButton), the
      // account drops off this list entirely rather than lingering with a
      // "restore" row, per explicit user decision. It's still reachable via
      // "Thêm admin" → search, and re-granting there reactivates the old
      // revoked rows (see setAccountPermissionsAction).
      OR: [{ adminPermissions: { some: { revokedAt: null } } }, { isAdminManager: true }],
      ...(isSuperAdmin ? {} : { isAdminManager: false }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      adminOnly: true,
      isAdminManager: true,
      createdAt: true,
      adminPermissions: { select: { permission: true, revokedAt: true } },
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
          {admins.map((admin) => {
            const activePermissions = admin.adminPermissions.filter((p) => !p.revokedAt);
            const revokedPermissions = admin.adminPermissions.filter((p) => p.revokedAt);
            const fullyRevoked = activePermissions.length === 0;
            return (
              <div
                key={admin.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
              >
                <Link href={`/admin/admins/${admin.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {admin.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                      {admin.isAdminManager && <Badge color="primary">Admin Manager</Badge>}
                      <Badge color={admin.adminOnly ? "warning" : "muted"}>
                        {admin.adminOnly ? "Chỉ admin" : "Học viên + Admin"}
                      </Badge>
                      <StatusBadge status={admin.status} />
                    </div>
                    <p className="truncate text-xs text-muted">{admin.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {fullyRevoked ? (
                        <>
                          <span className="text-xs text-muted">Đã thu hồi toàn bộ quyền —</span>
                          {revokedPermissions.map(({ permission }) => (
                            <Badge key={permission} color="muted">
                              {ADMIN_PERMISSION_LABELS[permission]}
                            </Badge>
                          ))}
                        </>
                      ) : (
                        activePermissions.map(({ permission }) => (
                          <Badge key={permission} color="primary">
                            {ADMIN_PERMISSION_LABELS[permission]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted sm:block">
                    Tạo lúc {formatDateVN(admin.createdAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
                {fullyRevoked ? (
                  <RestorePermissionsButton adminId={admin.id} adminName={admin.name} />
                ) : (
                  <RevokeAllPermissionsButton
                    adminId={admin.id}
                    adminName={admin.name}
                    adminOnly={admin.adminOnly}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
