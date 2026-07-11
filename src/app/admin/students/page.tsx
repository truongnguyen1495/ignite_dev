import Link from "next/link";
import { Plus, Eye, Users, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { LevelBadge } from "@/components/ui/level-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStudentStatusButton, DeleteStudentButton } from "./[studentId]/danger-actions";
import { PendingRegistrations } from "./pending-registrations";
import { PageHeader } from "@/components/ui/page-header";

export default async function StudentsPage() {
  await requireAdminPermission("MANAGE_STUDENTS");
  const allStudents = await prisma.user.findMany({
    where: { role: "STUDENT", adminOnly: false },
    orderBy: { createdAt: "desc" },
  });
  const pending = allStudents.filter((student) => student.status === "PENDING");
  const active = allStudents.filter((student) => student.status !== "PENDING");
  // "Chưa xếp cấp" accounts (open self-registration, no admin approval
  // anymore) are reviewed on their own page instead of mixed into this
  // table — see /admin/students/unassigned.
  const unassignedCount = active.filter((student) => student.grantedLevel === null).length;
  const students = active.filter((student) => student.grantedLevel !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Danh sách Học viên (${students.length})`}
        actions={
          <Link
            href="/admin/students/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm Học viên Mới
          </Link>
        }
      />

      <PendingRegistrations students={pending} />

      <Link
        href="/admin/students/unassigned"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Tài khoản chưa xếp cấp ({unassignedCount})</p>
          <p className="text-xs text-muted">
            Học viên tự đăng ký, chưa vào hệ thống đào tạo 5 cấp — chỉ xem được khóa học độc quyền, thư viện,
            bản tin.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có học viên nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Họ tên</th>
                <th className="px-4 py-3 font-medium sm:px-6">Tài khoản</th>
                <th className="px-4 py-3 font-medium sm:px-6">Cấp độ hiện tại</th>
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
                  <td className="px-4 py-4 sm:px-6">
                    <LevelBadge level={student.grantedLevel} />
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
                      <ToggleStudentStatusButton
                        studentId={student.id}
                        locked={student.status === "LOCKED"}
                        iconOnly
                      />
                      <DeleteStudentButton
                        studentId={student.id}
                        studentName={student.name}
                        iconOnly
                      />
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
