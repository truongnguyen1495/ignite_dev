import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LevelBadge } from "@/components/ui/level-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleStudentStatusButton, DeleteStudentButton } from "./[studentId]/danger-actions";

export default async function StudentsPage() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Danh sách Học viên ({students.length})</h1>
        <Link
          href="/admin/students/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Thêm Học viên Mới
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có học viên nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Họ tên</th>
                <th className="px-6 py-3 font-medium">Tài khoản</th>
                <th className="px-6 py-3 font-medium">Cấp độ hiện tại</th>
                <th className="px-6 py-3 font-medium">Trạng thái</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-6 py-4 font-medium text-foreground">{student.name}</td>
                  <td className="px-6 py-4 text-muted">{student.email}</td>
                  <td className="px-6 py-4">
                    <LevelBadge level={student.grantedLevel} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-6 py-4">
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
