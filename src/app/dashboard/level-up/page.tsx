import Link from "next/link";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, isMaxLevel, nextLevel } from "@/lib/levels";
import { getIncompleteQuizzesForLevel } from "@/lib/level-completion";
import { RequestLevelUpButton } from "./request-button";

const STATUS_LABELS = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã được duyệt",
  REJECTED: "Đã bị từ chối",
};

export default async function LevelUpPage() {
  const student = await requireActiveStudent();
  const latestRequest = await prisma.levelUpRequest.findFirst({
    where: { studentId: student.id },
    orderBy: { requestedAt: "desc" },
  });

  const atMaxLevel = isMaxLevel(student.grantedLevel);
  const hasPending = latestRequest?.status === "PENDING";
  const upcoming = nextLevel(student.grantedLevel);
  const incompleteQuizzes = atMaxLevel
    ? []
    : await getIncompleteQuizzesForLevel(student.id, student.grantedLevel);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Xin lên cấp</h1>
      <p className="text-sm text-muted">
        Cấp hiện tại: <span className="font-medium text-foreground">{LEVEL_LABELS[student.grantedLevel]}</span>
      </p>

      {latestRequest && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm">
          <p className="text-foreground">
            Yêu cầu gần nhất: lên <span className="font-medium">{LEVEL_LABELS[latestRequest.toLevel]}</span>
          </p>
          <p className="mt-2 flex items-center gap-1.5">
            {latestRequest.status === "APPROVED" ? (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> {STATUS_LABELS[latestRequest.status]}
              </span>
            ) : latestRequest.status === "REJECTED" ? (
              <span className="flex items-center gap-1.5 text-danger">
                <XCircle className="h-4 w-4" /> {STATUS_LABELS[latestRequest.status]}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-warning">
                <Clock className="h-4 w-4" /> {STATUS_LABELS[latestRequest.status]}
              </span>
            )}
          </p>
          {latestRequest.status === "REJECTED" && latestRequest.reviewerNote && (
            <p className="mt-1 text-muted">Lý do từ chối: {latestRequest.reviewerNote}</p>
          )}
        </div>
      )}

      {atMaxLevel ? (
        <p className="text-sm text-muted">Bạn đã ở cấp cao nhất.</p>
      ) : hasPending ? (
        <p className="text-sm text-muted">Yêu cầu của bạn đang chờ Super Admin duyệt.</p>
      ) : incompleteQuizzes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Bạn cần đạt tất cả bài test ở {LEVEL_LABELS[student.grantedLevel]} trước khi xin lên cấp. Còn thiếu:
          </p>
          <ul className="space-y-1 text-sm">
            {incompleteQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link href={`/dashboard/lessons/${quiz.lessonId}`} className="text-foreground hover:text-primary">
                  {quiz.lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <RequestLevelUpButton label={`Xin lên ${upcoming ? LEVEL_LABELS[upcoming] : ""}`} />
      )}
    </div>
  );
}
