import Link from "next/link";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, PartyPopper } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, isMaxLevel, nextLevel } from "@/lib/levels";
import { getIncompleteQuizzesForLevel } from "@/lib/level-completion";
import { RequestLevelUpButton } from "./request-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LevelBadge } from "@/components/ui/level-badge";

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
  const hasPending = latestRequest?.status === "PENDING";

  // latestRequest only ever indexes toLevel (always a real Level, even for a
  // join request), so this card is identical for both a no-cấp account and a
  // leveled one — computed once and reused by both branches below.
  const latestRequestCard = latestRequest && (
    <Card className="text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground">
          Yêu cầu gần nhất: {latestRequest.fromLevel ? "lên" : "vào"}{" "}
          <span className="font-medium">{LEVEL_LABELS[latestRequest.toLevel]}</span>
        </p>
        {latestRequest.status === "APPROVED" ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {STATUS_LABELS[latestRequest.status]}
          </span>
        ) : latestRequest.status === "REJECTED" ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 text-xs font-medium text-danger">
            <XCircle className="h-3.5 w-3.5" /> {STATUS_LABELS[latestRequest.status]}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning">
            <Clock className="h-3.5 w-3.5" /> {STATUS_LABELS[latestRequest.status]}
          </span>
        )}
      </div>
      {latestRequest.status === "REJECTED" && latestRequest.reviewerNote && (
        <p className="mt-3 border-t border-border pt-3 text-muted">
          Lý do từ chối: {latestRequest.reviewerNote}
        </p>
      )}
    </Card>
  );

  // No cấp yet — this is the join-request path, not the level-up path.
  // There's no current level, so none of the max-level/quiz-completion UI
  // below applies.
  if (student.grantedLevel === null) {
    return (
      <div className="max-w-xl space-y-6">
        <PageHeader
          title="Tham gia hệ thống đào tạo 5 cấp"
          description="Tài khoản của bạn hiện chưa thuộc cấp nào."
        />

        {latestRequestCard}

        {hasPending ? (
          <Card className="flex items-center gap-3 text-sm">
            <Clock className="h-5 w-5 shrink-0 text-warning" />
            <p className="text-foreground">Yêu cầu của bạn đang chờ Super Admin duyệt.</p>
          </Card>
        ) : (
          <RequestLevelUpButton label="Yêu cầu tham gia hệ thống đào tạo 5 cấp" />
        )}
      </div>
    );
  }

  const atMaxLevel = isMaxLevel(student.grantedLevel);
  const upcoming = nextLevel(student.grantedLevel);
  const incompleteQuizzes = atMaxLevel
    ? []
    : await getIncompleteQuizzesForLevel(student.id, student.grantedLevel);

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Xin lên cấp"
        description={`Cấp hiện tại: ${LEVEL_LABELS[student.grantedLevel]}`}
      />

      {latestRequestCard}

      {atMaxLevel ? (
        <Card className="flex items-center gap-3 text-sm">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-foreground">Bạn đã ở cấp cao nhất.</p>
        </Card>
      ) : hasPending ? (
        <Card className="flex items-center gap-3 text-sm">
          <Clock className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-foreground">Yêu cầu của bạn đang chờ Super Admin duyệt.</p>
        </Card>
      ) : incompleteQuizzes.length > 0 ? (
        <Card className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="flex flex-wrap items-center gap-1.5">
              <span>Bạn cần đạt tất cả bài test ở</span>
              <LevelBadge level={student.grantedLevel} full />
              <span>
                trước khi xin lên cấp. Còn thiếu {incompleteQuizzes.length} bài:
              </span>
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {incompleteQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/dashboard/lessons/${quiz.lessonId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  <span>{quiz.lesson.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <RequestLevelUpButton label={`Xin lên ${upcoming ? LEVEL_LABELS[upcoming] : ""}`} />
      )}
    </div>
  );
}
