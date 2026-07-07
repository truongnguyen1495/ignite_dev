import Link from "next/link";
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
      <h1 className="text-xl font-semibold">Xin lên cấp</h1>
      <p className="text-sm text-zinc-500">
        Cấp hiện tại: <span className="font-medium text-zinc-900 dark:text-zinc-100">{LEVEL_LABELS[student.grantedLevel]}</span>
      </p>

      {latestRequest && (
        <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p>
            Yêu cầu gần nhất: lên <span className="font-medium">{LEVEL_LABELS[latestRequest.toLevel]}</span>
          </p>
          <p className="mt-1">
            Trạng thái:{" "}
            <span
              className={
                latestRequest.status === "APPROVED"
                  ? "text-green-700 dark:text-green-400"
                  : latestRequest.status === "REJECTED"
                    ? "text-red-700 dark:text-red-400"
                    : "text-zinc-500"
              }
            >
              {STATUS_LABELS[latestRequest.status]}
            </span>
          </p>
          {latestRequest.status === "REJECTED" && latestRequest.reviewerNote && (
            <p className="mt-1 text-zinc-500">Lý do từ chối: {latestRequest.reviewerNote}</p>
          )}
        </div>
      )}

      {atMaxLevel ? (
        <p className="text-sm text-zinc-500">Bạn đã ở cấp cao nhất.</p>
      ) : hasPending ? (
        <p className="text-sm text-zinc-500">Yêu cầu của bạn đang chờ Super Admin duyệt.</p>
      ) : incompleteQuizzes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">
            Bạn cần đạt tất cả bài test ở {LEVEL_LABELS[student.grantedLevel]} trước khi xin lên cấp. Còn thiếu:
          </p>
          <ul className="space-y-1 text-sm">
            {incompleteQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link href={`/dashboard/lessons/${quiz.lessonId}`} className="text-zinc-900 hover:underline dark:text-zinc-100">
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
