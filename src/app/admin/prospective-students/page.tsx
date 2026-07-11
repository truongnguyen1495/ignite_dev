import Link from "next/link";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { ToggleStudentStatusButton, DeleteStudentButton } from "../students/[studentId]/danger-actions";
import { PendingJoinRequests } from "./pending-join-requests";

export default async function ProspectiveStudentsPage() {
  await requireAdminPermission("MANAGE_PROSPECTIVE_STUDENTS");

  const [students, pendingRequests] = await Promise.all([
    // "Học sinh" — self-registered (or admin-created) accounts not yet on
    // the 5-level ladder. Kept as its own page/permission, independent of
    // "Học viên" (/admin/students, leveled accounts).
    prisma.user.findMany({
      where: { role: "STUDENT", adminOnly: false, grantedLevel: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.levelUpRequest.findMany({
      where: { fromLevel: null, status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { student: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Học sinh (${students.length})`} />

      <PendingJoinRequests requests={pendingRequests} />

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
                    {student.createdAt.toLocaleDateString("vi-VN")}
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
                      <DeleteStudentButton studentId={student.id} studentName={student.name} iconOnly />
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
