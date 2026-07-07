import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EditStudentForm } from "./edit-student-form";
import { DeleteStudentButton, ToggleStudentStatusButton } from "./danger-actions";
import { LEVEL_LABELS } from "@/lib/levels";
import { Badge } from "@/components/ui/badge";

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
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{student.name}</h1>
      </div>

      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <EditStudentForm
          studentId={student.id}
          name={student.name}
          email={student.email}
          grantedLevel={student.grantedLevel}
        />
      </div>

      <div className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-muted">Lịch sử làm bài test ({attempts.length})</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">Học viên chưa làm bài test nào.</p>
        ) : (
          <ul className="space-y-2">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="text-foreground">{attempt.quiz.lesson.title}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-foreground">{attempt.scorePercent}%</span>
                  {attempt.passed ? (
                    <Badge color="success">Đạt</Badge>
                  ) : (
                    <Badge color="danger">Chưa đạt</Badge>
                  )}
                  <span className="text-muted">{attempt.attemptedAt.toLocaleString("vi-VN")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-muted">Lịch sử xin lên cấp ({levelUpRequests.length})</h2>
        {levelUpRequests.length === 0 ? (
          <p className="text-sm text-muted">Học viên chưa gửi yêu cầu lên cấp nào.</p>
        ) : (
          <ul className="space-y-2">
            {levelUpRequests.map((req) => (
              <li key={req.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-foreground">
                    {LEVEL_LABELS[req.fromLevel]}
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted" />
                    {LEVEL_LABELS[req.toLevel]}
                  </span>
                  {req.status === "APPROVED" ? (
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                    </span>
                  ) : req.status === "REJECTED" ? (
                    <span className="flex items-center gap-1 text-danger">
                      <XCircle className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                    </span>
                  ) : (
                    <span className="text-muted">{LEVEL_UP_STATUS_LABELS[req.status]}</span>
                  )}
                </div>
                <div className="mt-1 text-muted">
                  {req.requestedAt.toLocaleString("vi-VN")}
                  {req.status === "REJECTED" && req.reviewerNote && ` — Lý do: ${req.reviewerNote}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-xl space-y-3 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <div className="flex items-center gap-3">
          <ToggleStudentStatusButton studentId={student.id} locked={student.status === "LOCKED"} />
          <DeleteStudentButton studentId={student.id} studentName={student.name} redirectAfter />
        </div>
      </div>
    </div>
  );
}
