import "server-only";
import type { Level } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// What finishing a lesson means depends on whether it owns a quiz, and the
// two conditions are deliberately NOT combined:
//
//   • lesson with a quiz    → passing that quiz, exactly as before this
//                             file existed. Nothing a student already
//                             finished ever regresses to unfinished.
//   • lesson without a quiz → a LessonCompletion row ("Đánh dấu đã học"),
//                             which is the only way such a lesson could
//                             ever be finished — before, it was stuck on
//                             "Chưa hoàn thành" forever.
//
// Requiring BOTH on a quiz lesson would have retroactively un-finished
// every lesson every existing student has already passed, and would also
// make finishing a level stricter than the level-up condition it sits next
// to (see pendingQuizCount below).
export type LevelLessonProgressItem = {
  id: string;
  title: string;
  description: string | null;
  hasVideo: boolean;
  durationSeconds: number | null;
  watchedSeconds: number;
  watchedPercent: number | null;
  quizId: string | null;
  quizPassed: boolean;
  /** Has taken the quiz at all, passing or not. */
  quizAttempted: boolean;
  markedDone: boolean;
  completed: boolean;
  /** Started but not finished — drives the "Đang học"/"Cần đạt bài test" states. */
  started: boolean;
};

export type LevelProgress = {
  items: LevelLessonProgressItem[];
  total: number;
  completedCount: number;
  /** 0–100, rounded. 0 for a level with no lessons at all. */
  percent: number;
  /** First unfinished lesson — what "Học tiếp" jumps to. Null when done. */
  nextLesson: LevelLessonProgressItem | null;
  /**
   * Quizzes at this level with no passing attempt yet. This — not
   * `total - completedCount` — is the real level-up condition, matching
   * getIncompleteQuizzesForLevel exactly, so the gate at the bottom of the
   * level page can never disagree with /dashboard/level-up.
   */
  pendingQuizCount: number;
};

/**
 * Everything the level page needs about one student's standing at one
 * level, in a single findMany: the per-student quiz attempt, completion
 * row and watch-progress row all ride along as filtered relations rather
 * than a query per lesson (this DB runs with connection_limit=1, so N+1
 * here would be N sequential round-trips, not N parallel ones).
 */
export async function getLevelLessonProgress(
  studentId: string,
  level: Level
): Promise<LevelProgress> {
  const lessons = await prisma.lesson.findMany({
    where: { level },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      youtubeId: true,
      durationSeconds: true,
      quiz: {
        select: {
          id: true,
          // One row answers both questions this page asks: ordering by
          // `passed` descending puts a passing attempt first when one
          // exists, so row.passed tells us whether the quiz is cleared,
          // and the row merely existing tells us the student has taken it
          // (a failed attempt still counts as "started", which is why this
          // isn't filtered to passed-only).
          attempts: {
            where: { studentId },
            select: { passed: true },
            orderBy: { passed: "desc" },
            take: 1,
          },
        },
      },
      completions: { where: { studentId }, select: { id: true }, take: 1 },
      watchProgress: { where: { studentId }, select: { watchedSeconds: true }, take: 1 },
    },
  });

  const items: LevelLessonProgressItem[] = lessons.map((lesson) => {
    const quizId = lesson.quiz?.id ?? null;
    const quizAttempted = (lesson.quiz?.attempts.length ?? 0) > 0;
    const quizPassed = lesson.quiz?.attempts[0]?.passed === true;
    const markedDone = lesson.completions.length > 0;
    const watchedSeconds = lesson.watchProgress[0]?.watchedSeconds ?? 0;
    const completed = quizId ? quizPassed : markedDone;

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      hasVideo: Boolean(lesson.youtubeId),
      durationSeconds: lesson.durationSeconds,
      watchedSeconds,
      watchedPercent: lesson.durationSeconds
        ? Math.min(100, Math.round((watchedSeconds / lesson.durationSeconds) * 100))
        : null,
      quizId,
      quizPassed,
      quizAttempted,
      markedDone,
      completed,
      started: !completed && (markedDone || quizAttempted || watchedSeconds > 0),
    };
  });

  const completedCount = items.filter((item) => item.completed).length;

  return {
    items,
    total: items.length,
    completedCount,
    percent: items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100),
    nextLesson: items.find((item) => !item.completed) ?? null,
    pendingQuizCount: items.filter((item) => item.quizId && !item.quizPassed).length,
  };
}

/** App-wide convention for lesson length — same wording as the course sidebar. */
export function formatLessonDuration(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} phút`;
}
