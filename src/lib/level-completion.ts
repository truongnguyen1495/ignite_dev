import "server-only";
import type { Level } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Quizzes belonging to lessons at `level` that this student has never passed
 * (or never attempted). An empty result means the student has at least one
 * passing attempt for every quiz at their current level.
 */
export async function getIncompleteQuizzesForLevel(studentId: string, level: Level) {
  const quizzes = await prisma.quiz.findMany({
    where: { lesson: { level } },
    include: {
      lesson: true,
      attempts: { where: { studentId, passed: true }, take: 1 },
    },
    orderBy: { lesson: { order: "asc" } },
  });

  return quizzes.filter((quiz) => quiz.attempts.length === 0);
}
