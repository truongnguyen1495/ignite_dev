import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, PlayCircle } from "lucide-react";
import { requireLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";
import { formatLessonDuration } from "@/lib/level-progress";
import { fetchYoutubeDurationSeconds } from "@/lib/youtube-duration";
import { YoutubeTrackedEmbed } from "@/components/youtube-tracked-embed";
import { LessonWatchProgressProvider } from "@/components/lesson-watch-progress-provider";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Card } from "@/components/ui/card";
import { MarkCompleteButton } from "./mark-complete-button";
import { syncLessonWatchProgressAction } from "./actions";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  // requireLessonAccess re-fetches grantedLevel fresh from the DB and blocks
  // this page server-side if the student isn't allowed to see this lesson's
  // level — this is what stops direct-URL access, not just hidden nav links.
  const { student, lesson } = await requireLessonAccess(lessonId);

  // One round-trip for all four reads — this DB runs with
  // connection_limit=1, so separate awaits would queue up sequentially.
  const [quiz, settings, watchProgress, completion] = await prisma.$transaction([
    prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      select: {
        id: true,
        attempts: {
          where: { studentId: student.id, passed: true },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.lessonWatchProgress.findUnique({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      select: { watchedSeconds: true },
    }),
    prisma.lessonCompletion.findUnique({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      select: { id: true },
    }),
  ]);

  // Lessons created before durationSeconds existed have a video but no
  // known length, which would leave them permanently un-gated and without a
  // duration chip. Fill it in on first view instead of asking an admin to
  // re-save every old lesson by hand: best-effort (returns null without a
  // YOUTUBE_API_KEY, no network call at all in that case) and it runs at
  // most once per lesson, since the value is stored afterwards.
  let durationSeconds = lesson.durationSeconds;
  if (lesson.youtubeId && durationSeconds == null) {
    durationSeconds = await fetchYoutubeDurationSeconds(lesson.youtubeId);
    if (durationSeconds != null) {
      await prisma.lesson.update({ where: { id: lesson.id }, data: { durationSeconds } });
    }
  }

  const quizPassed = (quiz?.attempts.length ?? 0) > 0;
  // Only a lesson with a video AND a known duration can be gated — see
  // Settings.lessonWatchThresholdPercent in schema.prisma.
  const watchGateEnforced = Boolean(lesson.youtubeId && durationSeconds) && settings.enforceLessonWatchForHocVien;
  const initialWatchedSeconds = watchProgress?.watchedSeconds ?? 0;

  return (
    <LessonWatchProgressProvider
      lessonId={lesson.id}
      durationSeconds={durationSeconds}
      initialWatchedSeconds={initialWatchedSeconds}
      syncAction={syncLessonWatchProgressAction}
    >
      <div className="max-w-3xl space-y-6">
        <div>
          <BackLink href={`/dashboard/levels/${lesson.level}`}>{LEVEL_LABELS[lesson.level]}</BackLink>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{lesson.title}</h1>
          {lesson.description && <p className="mt-1 text-sm text-muted">{lesson.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            {durationSeconds != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-faint" />
                {formatLessonDuration(durationSeconds)}
              </span>
            )}
            {lesson.youtubeId && durationSeconds == null && (
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5 text-faint" />
                Có video
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-faint" />
              {quiz ? "Có bài test" : "Không có bài test"}
            </span>
          </div>
        </div>

        {lesson.youtubeId && (
          <YoutubeTrackedEmbed
            videoId={lesson.youtubeId}
            durationSeconds={durationSeconds}
            initialWatchedSeconds={initialWatchedSeconds}
          />
        )}

        <Card>
          <CollapsibleSection title="Nội dung bài học">
            <div className="mt-4">
              <LessonMarkdown content={lesson.content} />
            </div>
          </CollapsibleSection>
        </Card>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {quiz ? (
            // A lesson with a quiz is finished by passing that quiz — there
            // is nothing to mark by hand here (see src/lib/level-progress.ts).
            <>
              {quizPassed && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-success-bg px-4 py-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã đạt bài test
                </span>
              )}
              <Link
                href={`/dashboard/quizzes/${quiz.id}`}
                className={
                  quizPassed
                    ? "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
                    : "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                }
              >
                <ClipboardList className="h-4 w-4" />
                {quizPassed ? "Làm lại bài test" : "Làm bài test"}
              </Link>
            </>
          ) : (
            <MarkCompleteButton
              lessonId={lesson.id}
              completed={Boolean(completion)}
              enforced={watchGateEnforced}
              thresholdPercent={settings.lessonWatchThresholdPercent}
            />
          )}

          <Link
            href={`/dashboard/levels/${lesson.level}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-hover"
          >
            Về lộ trình cấp
          </Link>
        </div>
      </div>
    </LessonWatchProgressProvider>
  );
}
