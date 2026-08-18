import { CheckCircle2 } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, isMaxLevel, nextLevel } from "@/lib/levels";
import { getIncompleteQuizzesForLevel } from "@/lib/level-completion";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LevelUpPanel } from "./level-up-panel";

export default async function LevelUpPage() {
  const student = await requireActiveStudent();
  const latestRequest = await prisma.levelUpRequest.findFirst({
    where: { studentId: student.id },
    orderBy: { requestedAt: "desc" },
    select: { status: true, toLevel: true, reviewerNote: true },
  });

  // Every other state — waiting, declined, blocked by tests, eligible, top
  // of the ladder — is LevelUpPanel's job, so this page and the roadmap on
  // /dashboard can't describe the same situation differently. Only the
  // "approved" confirmation is left here: by then the student's level has
  // already moved up, so the panel below is showing the NEXT gate and this
  // is the one place that still reports how they got here.
  const approved =
    latestRequest?.status === "APPROVED" ? LEVEL_LABELS[latestRequest.toLevel] : null;

  const atMaxLevel = isMaxLevel(student.grantedLevel);
  const incompleteQuizzes = atMaxLevel
    ? []
    : await getIncompleteQuizzesForLevel(student.id, student.grantedLevel);

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Xin lên cấp"
        description={`Cấp hiện tại: ${LEVEL_LABELS[student.grantedLevel]}`}
      />

      {approved && (
        <Card className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-foreground">
            Yêu cầu gần nhất lên <span className="font-medium">{approved}</span> đã được duyệt.
          </p>
        </Card>
      )}

      <LevelUpPanel
        upcoming={nextLevel(student.grantedLevel)}
        latestRequest={latestRequest}
        pendingQuizzes={incompleteQuizzes.map((quiz) => ({
          lessonId: quiz.lessonId,
          title: quiz.lesson.title,
        }))}
      />
    </div>
  );
}
