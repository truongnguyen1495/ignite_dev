import Link from "next/link";
import { notFound } from "next/navigation";
import { requireQuizAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type AttemptAnswers = Record<string, { selected: string[]; correct: boolean }>;

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const { quizId, attemptId } = await params;
  const { student, quiz } = await requireQuizAccess(quizId);

  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.quizId !== quizId || attempt.studentId !== student.id) {
    notFound();
  }

  const questions = await prisma.question.findMany({
    where: { quizId },
    orderBy: { order: "asc" },
  });

  const answers = attempt.answers as AttemptAnswers;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/lessons/${quiz.lessonId}`} className="text-sm text-zinc-500 hover:underline">
          ← Quay lại bài học
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{quiz.title} — Kết quả</h1>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          attempt.passed
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        }`}
      >
        <p className="text-2xl font-semibold">{attempt.scorePercent}%</p>
        <p className={attempt.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
          {attempt.passed ? "Đạt" : "Chưa đạt"} (ngưỡng đạt: {attempt.passThreshold}%)
        </p>
      </div>

      <ul className="space-y-2">
        {questions.map((question, index) => {
          const result = answers[question.id];
          return (
            <li
              key={question.id}
              className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <span aria-hidden>{result?.correct ? "✅" : "❌"}</span>
              <span>
                {index + 1}. {question.text}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/dashboard/quizzes/${quizId}`}
        className="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Làm lại bài test
      </Link>
    </div>
  );
}
