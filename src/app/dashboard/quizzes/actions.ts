"use server";

import { redirect } from "next/navigation";
import { requireQuizAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function submitQuizAttemptAction(quizId: string, formData: FormData) {
  // requireQuizAccess re-checks the student's grantedLevel fresh from the DB —
  // blocks a student from submitting an attempt for a quiz above their level
  // even if they crafted the request directly, bypassing the UI entirely.
  const { student } = await requireQuizAccess(quizId);

  // Independent reads (neither depends on the other's result) — fetched
  // together instead of one after another.
  const [questions, quiz, settings] = await Promise.all([
    prisma.question.findMany({
      where: { quizId },
      include: { options: true },
      orderBy: { order: "asc" },
    }),
    prisma.quiz.findUniqueOrThrow({ where: { id: quizId }, select: { passThreshold: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  const passThreshold = quiz.passThreshold ?? settings.passPercentage;

  const answers: Record<string, { selected: string[]; correct: boolean }> = {};
  let correctCount = 0;

  for (const question of questions) {
    const selected = formData.getAll(`answer-${question.id}`).map(String);
    const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
    const selectedSet = new Set(selected);
    const isCorrect =
      correctIds.size === selectedSet.size && [...correctIds].every((id) => selectedSet.has(id));
    answers[question.id] = { selected, correct: isCorrect };
    if (isCorrect) correctCount++;
  }

  const scorePercent =
    questions.length === 0 ? 0 : Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= passThreshold;

  const attempt = await prisma.quizAttempt.create({
    data: {
      studentId: student.id,
      quizId,
      answers: answers as unknown as Prisma.InputJsonValue,
      scorePercent,
      passed,
      passThreshold,
    },
  });

  redirect(`/dashboard/quizzes/${quizId}/result/${attempt.id}`);
}
