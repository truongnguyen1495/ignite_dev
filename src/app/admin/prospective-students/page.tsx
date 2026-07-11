import Link from "next/link";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, getAdminPermissions } from "@/lib/access";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN } from "@/lib/date";
import { ToggleStudentStatusButton, DeleteStudentButton } from "../students/[studentId]/danger-actions";

export default async function ProspectiveStudentsPage() {
  const admin = await requireAdminPermission("MANAGE_PROSPECTIVE_STUDENTS");
  // Locking/deleting an existing học sinh each need their own permission —
  // MANAGE_PROSPECTIVE_STUDENTS above only covers viewing + creating. See
  // the same split on the Học viên list page (admin/students/page.tsx).
  const isSuperAdmin = admin.role === "SUPER_ADMIN";
  const granted = isSuperAdmin ? null : await getAdminPermissions(admin.id);
  const canLock = isSuperAdmin || !!granted?.has("LOCK_PROSPECTIVE_STUDENTS");
  const canDelete = isSuperAdmin || !!granted?.has("DELETE_PROSPECTIVE_STUDENTS");

  // "Học sinh" — self-registered (or admin-created) accounts not yet on
  // the 5-level ladder. Kept as its own page/permission, independent of
  // "Học viên" (/admin/students, leveled accounts). Pending "tham gia hệ
  // thống đào tạo 5 cấp" requests are reviewed over on /admin/students
  // instead — approving one admits someone into the Học viên roster, so
  // that's where the review queue belongs (moved there per user request).
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", adminOnly: false, grantedLevel: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`Học sinh (${students.length})`} />

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có học sinh nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Họ tên</th>
                <th className="px-4 py-3 font-medium sm:px-6">Tài khoản</th>
                <th className="px-4 py-3 font-medium sm:px-6">Ngày đăng ký</th>
                <th className="px-4 py-3 font-medium sm:px-6">Trạng thái</th>
                <th className="px-4 py-3 font-medium sm:px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-4 sm:px-6 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-4 sm:px-6 text-muted">
                    {student.email}
                    {student.username && (
                      <span className="block text-xs text-faint">@{student.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-6 text-muted">
                    {formatDateVN(student.createdAt)}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/students/${student.id}`}
                        title="Xem / sửa"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {canLock && (
                        <ToggleStudentStatusButton
                          studentId={student.id}
                          locked={student.status === "LOCKED"}
                          iconOnly
                        />
                      )}
                      {canDelete && (
                        <DeleteStudentButton studentId={student.id} studentName={student.name} iconOnly />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
