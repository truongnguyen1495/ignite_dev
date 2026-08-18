import "server-only";
import type { Level, LevelUpStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, levelRank, nextLevel } from "@/lib/levels";
import { isLessonComplete } from "@/lib/level-progress";

/**
 * Where one level sits relative to the student reading the page.
 *
 *   completed → below them, every lesson finished
 *   unlocked  → below them, still has lessons left (or none published yet)
 *   current   → the level they're standing on
 *   next      → the one immediately above; the only locked level worth
 *               explaining how to reach
 *   locked    → further up the ladder
 */
export type LevelStepStatus = "completed" | "unlocked" | "current" | "next" | "locked";

export type LevelRoadmapStep = {
  level: Level;
  status: LevelStepStatus;
  /** True for the student's own level and everything below it. */
  unlocked: boolean;
  lessonCount: number;
  quizCount: number;
  completedCount: number;
  /** 0–100, rounded. 0 when the level has no lessons yet. */
  percent: number;
  /**
   * How many extras become available on reaching this level, counted from
   * the three per-level grant tables the catalog pages check — so a chip
   * here can't advertise something those then hide.
   */
  unlocks: { courses: number; library: number; products: number };
  /**
   * Where the card links, or null when there's nothing to open: a locked
   * level, or one with no lessons published. The old page linked every
   * unlocked level unconditionally, and Cấp 0 (zero lessons) landed on a
   * blank "Chưa có bài học nào ở cấp này."
   */
  href: string | null;
};

export type LevelRoadmap = {
  steps: LevelRoadmapStep[];
  /** Always present: every student stands on exactly one level. */
  current: LevelRoadmapStep;
  /** The level above the student's, or null at the top of the ladder. */
  upcoming: Level | null;
  /** First unfinished lesson of the current level — what "Học tiếp" opens. */
  nextLesson: { id: string; title: string; position: number } | null;
  /**
   * Quizzes at the current level with no passing attempt yet — the exact
   * list standing between this student and a level-up request. Empty means
   * eligible.
   */
  pendingQuizzes: { lessonId: string; title: string }[];
  latestRequest: {
    status: LevelUpStatus;
    toLevel: Level;
    reviewerNote: string | null;
  } | null;
};

/**
 * The whole ladder for one student.
 *
 * DATABASE_URL runs with connection_limit=1, so Promise.all does NOT
 * parallelize here — seven awaits would be seven sequential round trips.
 * $transaction sends them as one batch instead. Measured against the live
 * database (Tokyo, ~350ms per round trip): 2853ms sequential → 1330ms
 * batched.
 *
 * The per-student facts are read as three FLAT queries rather than one
 * findMany with nested relations, which was the other 450ms: Prisma expands
 * each nested relation into its own statement, and the roadmap needs none
 * of the watch-progress data that shape drags along. Lesson rows come back
 * unfiltered by level and are grouped in memory — one query, not one per
 * level.
 *
 * Note what deliberately does NOT cross the wire: nothing per-lesson for
 * levels the student can't open. Only aggregates (how many lessons, how
 * many tests) and the current level's own titles are returned, so the RSC
 * payload of a Cấp 1 member never carries Cấp 5's curriculum.
 */
export async function getLevelRoadmap(
  studentId: string,
  grantedLevel: Level
): Promise<LevelRoadmap> {
  // Each query is bound to a const before the batch: passing groupBy calls
  // inline to $transaction collapses their return type and loses `_count`.
  const lessonsQuery = prisma.lesson.findMany({
    orderBy: { order: "asc" },
    select: { id: true, level: true, title: true, quiz: { select: { id: true } } },
  });
  const passedQuizzesQuery = prisma.quizAttempt.findMany({
    where: { studentId, passed: true },
    select: { quizId: true },
    distinct: ["quizId"],
  });
  const completionsQuery = prisma.lessonCompletion.findMany({
    where: { studentId },
    select: { lessonId: true },
  });
  // Latest request, then check its status — the same read /dashboard/level-up
  // does, rather than "any PENDING row", so both agree on what still counts
  // as waiting after a rejection.
  const latestRequestQuery = prisma.levelUpRequest.findFirst({
    where: { studentId },
    orderBy: { requestedAt: "desc" },
    select: { status: true, toLevel: true, reviewerNote: true },
  });
  const courseGrantsQuery = prisma.courseLevelGrant.groupBy({
    by: ["minLevel"],
    _count: { _all: true },
    orderBy: { minLevel: "asc" },
  });
  // Library is the one of the three with a student-facing master switch; an
  // item hidden from members shouldn't be advertised as a reward.
  const libraryGrantsQuery = prisma.libraryLevelGrant.groupBy({
    by: ["minLevel"],
    where: { libraryItem: { visibleToStudents: true } },
    _count: { _all: true },
    orderBy: { minLevel: "asc" },
  });
  const productGrantsQuery = prisma.productLevelGrant.groupBy({
    by: ["minLevel"],
    _count: { _all: true },
    orderBy: { minLevel: "asc" },
  });

  const [lessons, passedQuizzes, completions, latestRequest, courseGrants, libraryGrants, productGrants] =
    await prisma.$transaction([
      lessonsQuery,
      passedQuizzesQuery,
      completionsQuery,
      latestRequestQuery,
      courseGrantsQuery,
      libraryGrantsQuery,
      productGrantsQuery,
    ]);

  const passedQuizIds = new Set(passedQuizzes.map((attempt) => attempt.quizId));
  const markedDoneLessonIds = new Set(completions.map((completion) => completion.lessonId));

  // Delegated so this page and the level page apply one rule, not two.
  const isDone = (lesson: (typeof lessons)[number]) =>
    isLessonComplete(
      lesson.quiz?.id ?? null,
      lesson.quiz ? passedQuizIds.has(lesson.quiz.id) : false,
      markedDoneLessonIds.has(lesson.id)
    );

  const tally = new Map(
    ORDERED_LEVELS.map((level) => [level, { lessons: 0, quizzes: 0, completed: 0 }])
  );
  for (const lesson of lessons) {
    const bucket = tally.get(lesson.level);
    // Only skippable if a Level value existed outside ORDERED_LEVELS, which
    // the enum makes impossible — the guard is here so a future ladder
    // change can't silently throw on a live page.
    if (!bucket) continue;
    bucket.lessons += 1;
    if (lesson.quiz) bucket.quizzes += 1;
    if (isDone(lesson)) bucket.completed += 1;
  }

  const countByLevel = (rows: { minLevel: Level; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.minLevel, row._count._all]));
  const courseCounts = countByLevel(courseGrants);
  const libraryCounts = countByLevel(libraryGrants);
  const productCounts = countByLevel(productGrants);

  const currentRank = levelRank(grantedLevel);

  const steps = ORDERED_LEVELS.map((level): LevelRoadmapStep => {
    // Non-null: built from this same list directly above.
    const counts = tally.get(level)!;
    const rank = levelRank(level);
    const unlocked = rank <= currentRank;

    // A level with nothing published is never "completed" — a full green
    // bar would read as an achievement the member never earned.
    const status: LevelStepStatus =
      rank === currentRank
        ? "current"
        : rank > currentRank
          ? rank === currentRank + 1
            ? "next"
            : "locked"
          : counts.lessons > 0 && counts.completed === counts.lessons
            ? "completed"
            : "unlocked";

    return {
      level,
      status,
      unlocked,
      lessonCount: counts.lessons,
      quizCount: counts.quizzes,
      completedCount: counts.completed,
      percent: counts.lessons === 0 ? 0 : Math.round((counts.completed / counts.lessons) * 100),
      unlocks: {
        courses: courseCounts.get(level) ?? 0,
        library: libraryCounts.get(level) ?? 0,
        products: productCounts.get(level) ?? 0,
      },
      href: unlocked && counts.lessons > 0 ? `/dashboard/levels/${level}` : null,
    };
  });

  // Ordered by `order` already, and filtering keeps that order within the
  // level, so the first unfinished row is genuinely the next one to study.
  const currentLessons = lessons.filter((lesson) => lesson.level === grantedLevel);
  const nextIndex = currentLessons.findIndex((lesson) => !isDone(lesson));
  const next = nextIndex === -1 ? null : currentLessons[nextIndex];

  return {
    steps,
    // Non-null: ORDERED_LEVELS covers every member of the Level enum.
    current: steps.find((step) => step.level === grantedLevel)!,
    upcoming: nextLevel(grantedLevel),
    nextLesson: next ? { id: next.id, title: next.title, position: nextIndex + 1 } : null,
    pendingQuizzes: currentLessons
      .filter((lesson) => lesson.quiz && !passedQuizIds.has(lesson.quiz.id))
      .map((lesson) => ({ lessonId: lesson.id, title: lesson.title })),
    latestRequest,
  };
}
