import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, PlayCircle } from "lucide-react";
import { requireLevelAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, LEVEL_NAMES, nextLevel, parseLevel } from "@/lib/levels";
import { getLevelLessonProgress } from "@/lib/level-progress";
import { BackLink } from "@/components/ui/back-link";
import { LevelBadge } from "@/components/ui/level-badge";
import { LessonTrack } from "./lesson-track";
import { LevelUpGate } from "./level-up-gate";

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: levelParam } = await params;
  const level = parseLevel(levelParam);
  if (!level) {
    notFound();
  }

  // requireLevelAccess re-checks grantedLevel fresh from the DB — this is
  // what blocks a student from viewing a level's lesson list via direct URL.
  const student = await requireLevelAccess(level);

  const progress = await getLevelLessonProgress(student.id, level);

  // A student can open any level at or below their own; the level-up box
  // only belongs on the one they're actually standing on.
  const isCurrentLevel = student.grantedLevel === level;
  const upcoming = nextLevel(level);

  // Same read as /dashboard/level-up (latest request, then check its
  // status) rather than "any PENDING row", so both pages agree on what
  // counts as still-waiting after a rejection.
  const latestRequest =
    isCurrentLevel && upcoming
      ? await prisma.levelUpRequest.findFirst({
          where: { studentId: student.id },
          orderBy: { requestedAt: "desc" },
          select: { status: true, toLevel: true },
        })
      : null;

  const nextLessonIndex = progress.nextLesson
    ? progress.items.findIndex((item) => item.id === progress.nextLesson?.id)
    : -1;
  const barColor = progress.percent === 100 ? "bg-success" : "bg-primary";

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink href="/dashboard">Quay lại</BackLink>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <LevelBadge level={level} />
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{LEVEL_NAMES[level]}</h1>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {!isCurrentLevel
              ? `Bạn đang ở ${LEVEL_LABELS[student.grantedLevel]} — xem lại nội dung cấp này bất cứ lúc nào.`
              : upcoming
                ? `Đạt hết bài test của cấp này để xin lên ${LEVEL_LABELS[upcoming]}.`
                : "Đây là cấp cao nhất của lộ trình đào tạo."}
          </p>
        </div>

        {progress.total > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm text-muted">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{progress.completedCount}</span>
                {" / "}
                <span className="tabular-nums">{progress.total}</span> bài đã hoàn thành
              </span>
              <span className="font-semibold tabular-nums text-foreground">{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {progress.nextLesson && (
          <Link
            href={`/dashboard/lessons/${progress.nextLesson.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <PlayCircle className="h-4 w-4" />
            {progress.completedCount === 0 ? "Bắt đầu" : "Học tiếp"} bài {nextLessonIndex + 1}
          </Link>
        )}
      </div>

      {progress.total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <BookOpen className="h-7 w-7 text-faint" />
          <p className="text-sm font-medium text-foreground">Cấp này chưa có bài học</p>
          <p className="max-w-sm text-sm text-muted">
            Nội dung đang được biên soạn. Bạn sẽ thấy bài học ngay tại đây khi được đăng.
          </p>
        </div>
      ) : (
        <LessonTrack items={progress.items} nextLessonId={progress.nextLesson?.id ?? null} />
      )}

      {isCurrentLevel && (
        <LevelUpGate
          upcoming={upcoming}
          pendingToLevel={latestRequest?.status === "PENDING" ? latestRequest.toLevel : null}
          pendingQuizCount={progress.pendingQuizCount}
          unmarkedLessonCount={progress.total - progress.completedCount}
        />
      )}
    </div>
  );
}
