import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";

export default async function StudentsPage() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Học viên</h1>
        <Link
          href="/admin/students/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          + Thêm học viên
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có học viên nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">Tên</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Cấp hiện tại</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-2">{student.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{student.email}</td>
                  <td className="px-4 py-2">{LEVEL_LABELS[student.grantedLevel]}</td>
                  <td className="px-4 py-2">
                    {student.status === "ACTIVE" ? (
                      <span className="text-green-700 dark:text-green-400">Hoạt động</span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400">Đã khóa</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="text-zinc-500 hover:underline"
                    >
                      Sửa
                    </Link>
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
