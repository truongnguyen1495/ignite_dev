import "server-only";
import type { Level } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QuizCompletionDetail = {
  quizId: string;
  lessonId: string;
  lessonTitle: string;
  status: "passed" | "failed" | "not_attempted";
  scorePercent: number | null;
};

/**
 * Full picture of how many quizzes at `level` this student has passed vs.
 * still owes — `incomplete` lists the quizzes with no passing attempt yet.
 * `details` gives a per-lesson breakdown (status + latest score) for display,
 * e.g. so an admin reviewing a level-up request can see exactly what a
 * student has and hasn't done, not just the pass/fail count.
 */
export async function getLevelCompletionStatus(studentId: string, level: Level) {
  const quizzes = await prisma.quiz.findMany({
    where: { lesson: { level } },
    include: {
      lesson: true,
      attempts: { where: { studentId }, orderBy: { attemptedAt: "desc" } },
    },
    orderBy: { lesson: { order: "asc" } },
  });
  const incomplete = quizzes.filter((quiz) => !quiz.attempts.some((a) => a.passed));

  const details: QuizCompletionDetail[] = quizzes.map((quiz) => {
    const bestPass = quiz.attempts.find((a) => a.passed);
    const latest = bestPass ?? quiz.attempts[0] ?? null;
    return {
      quizId: quiz.id,
      lessonId: quiz.lessonId,
      lessonTitle: quiz.lesson.title,
      status: bestPass ? "passed" : latest ? "failed" : "not_attempted",
      scorePercent: latest?.scorePercent ?? null,
    };
  });

  return { total: quizzes.length, completed: quizzes.length - incomplete.length, incomplete, details };
}

/**
 * Quizzes belonging to lessons at `level` that this student has never passed
 * (or never attempted). An empty result means the student has at least one
 * passing attempt for every quiz at their current level.
 */
export async function getIncompleteQuizzesForLevel(studentId: string, level: Level) {
  return (await getLevelCompletionStatus(studentId, level)).incomplete;
}
