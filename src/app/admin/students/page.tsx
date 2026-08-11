import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { StudentsTable, type StudentRow } from "./students-table";

export default async function StudentsPage() {
  const admin = await requireAdminPermission("MANAGE_STUDENTS");
  // Editing/locking/deleting a thành viên each need their own permission —
  // stricter than the base MANAGE_STUDENTS gate on this page itself (which
  // only covers viewing the list + creating new accounts), so a limited
  // admin may see this list without being able to do any of them. Computed
  // once here to decide which action buttons each row renders.
  const isFullAdmin = hasFullAdminAccess(admin);
  const isSuperAdmin = admin.role === "SUPER_ADMIN";
  const granted = isFullAdmin ? null : await getAdminPermissions(admin.id);
  const canLock = isFullAdmin || !!granted?.has("LOCK_STUDENTS");
  const canDelete = isFullAdmin || !!granted?.has("DELETE_STUDENTS");
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      adminOnly: false,
      // A non-Super-Admin (even a full-access Admin Manager) must not
      // even see another Admin Manager here — same boundary as
      // admin/admins/page.tsx and the mutation actions in ./actions.ts.
      ...(isSuperAdmin ? {} : { isAdminManager: false }),
    },
    orderBy: { createdAt: "desc" },
  });
  const studentRows: StudentRow[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    username: s.username,
    avatarUrl: s.avatarUrl,
    grantedLevel: s.grantedLevel,
    status: s.status,
    joinedAt: s.createdAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Danh sách Thành viên (${students.length})`}
        actions={
          <Link
            href="/admin/students/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm Thành viên Mới
          </Link>
        }
      />

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có thành viên nào.</p>
      ) : (
        <StudentsTable students={studentRows} canLock={canLock} canDelete={canDelete} />
      )}
    </div>
  );
}
