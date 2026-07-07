import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditStudentForm } from "./edit-student-form";
import { DeleteStudentButton, ToggleStudentStatusButton } from "./danger-actions";
import { LEVEL_LABELS } from "@/lib/levels";

const LEVEL_UP_STATUS_LABELS = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") {
    notFound();
  }

  const [attempts, levelUpRequests] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { attemptedAt: "desc" },
      include: { quiz: { include: { lesson: true } } },
    }),
    prisma.levelUpRequest.findMany({
      where: { studentId },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/students" className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{student.name}</h1>
      </div>

      <EditStudentForm
        studentId={student.id}
        name={student.name}
        email={student.email}
        grantedLevel={student.grantedLevel}
      />

      <div className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">Lịch sử làm bài test ({attempts.length})</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-zinc-500">Học viên chưa làm bài test nào.</p>
        ) : (
          <ul className="space-y-2">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <span>{attempt.quiz.lesson.title}</span>
                <span className="flex items-center gap-3">
                  <span>{attempt.scorePercent}%</span>
                  <span className={attempt.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                    {attempt.passed ? "Đạt" : "Chưa đạt"}
                  </span>
                  <span className="text-zinc-400">{attempt.attemptedAt.toLocaleString("vi-VN")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">Lịch sử xin lên cấp ({levelUpRequests.length})</h2>
        {levelUpRequests.length === 0 ? (
          <p className="text-sm text-zinc-500">Học viên chưa gửi yêu cầu lên cấp nào.</p>
        ) : (
          <ul className="space-y-2">
            {levelUpRequests.map((req) => (
              <li key={req.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span>
                    {LEVEL_LABELS[req.fromLevel]} → {LEVEL_LABELS[req.toLevel]}
                  </span>
                  <span
                    className={
                      req.status === "APPROVED"
                        ? "text-green-700 dark:text-green-400"
                        : req.status === "REJECTED"
                          ? "text-red-700 dark:text-red-400"
                          : "text-zinc-500"
                    }
                  >
                    {LEVEL_UP_STATUS_LABELS[req.status]}
                  </span>
                </div>
                <div className="mt-1 text-zinc-400">
                  {req.requestedAt.toLocaleString("vi-VN")}
                  {req.status === "REJECTED" && req.reviewerNote && ` — Lý do: ${req.reviewerNote}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-md space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Khu vực nguy hiểm</h2>
        <div className="flex items-center gap-3">
          <ToggleStudentStatusButton
            studentId={student.id}
            locked={student.status === "LOCKED"}
          />
          <DeleteStudentButton studentId={student.id} studentName={student.name} />
        </div>
      </div>
    </div>
  );
}
