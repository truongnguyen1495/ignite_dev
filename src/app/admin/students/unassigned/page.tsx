import Link from "next/link";
import { Eye, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { ToggleStudentStatusButton, DeleteStudentButton } from "../[studentId]/danger-actions";

export default async function UnassignedStudentsPage() {
  await requireAdminPermission("MANAGE_STUDENTS");

  const [students, pendingRequests] = await Promise.all([
    // "Chưa xếp cấp" — self-registered (or admin-created) accounts not on
    // the 5-level ladder yet. status filter is defensive: the open
    // registration flow never creates PENDING rows anymore, but a stray one
    // from before that change shouldn't show up here.
    prisma.user.findMany({
      where: { role: "STUDENT", adminOnly: false, grantedLevel: null, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.levelUpRequest.findMany({
      where: { fromLevel: null, status: "PENDING" },
      select: { studentId: true },
    }),
  ]);
  const requestedIds = new Set(pendingRequests.map((r) => r.studentId));

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/students">Quay lại danh sách học viên</BackLink>
        <div className="mt-2">
          <PageHeader
            title={`Tài khoản chưa xếp cấp (${students.length})`}
            description="Tự đăng ký qua /register — chỉ xem được khóa học độc quyền, thư viện, bản tin và thông tin cá nhân cho tới khi được nhận vào hệ thống đào tạo 5 cấp."
          />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có tài khoản nào ở trạng thái chưa xếp cấp.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Họ tên</th>
                <th className="px-4 py-3 font-medium sm:px-6">Tài khoản</th>
                <th className="px-4 py-3 font-medium sm:px-6">Ngày đăng ký</th>
                <th className="px-4 py-3 font-medium sm:px-6">Trạng thái</th>
                <th className="px-4 py-3 font-medium sm:px-6">Yêu cầu tham gia</th>
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
                    {requestedIds.has(student.id) ? (
                      <Link
                        href="/admin/level-up-requests"
                        className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning hover:opacity-80"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Đang chờ duyệt
                      </Link>
                    ) : (
                      <span className="text-xs text-faint">Chưa gửi</span>
                    )}
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
