import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import { requireQuizAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { PassCelebration } from "./pass-celebration";

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

  // Only relevant once the student has passed — used to point "Bài tiếp
  // theo" at the next lesson in this level, ordered the same way the level's
  // lesson list is (Lesson.order).
  const nextLesson = attempt.passed
    ? await prisma.lesson.findFirst({
        where: { level: quiz.lesson.level, order: { gt: quiz.lesson.order } },
        orderBy: { order: "asc" },
      })
    : null;

  return (
    <div className="space-y-6">
      {attempt.passed && <PassCelebration scorePercent={attempt.scorePercent} />}
      <div>
        <BackLink href={`/dashboard/lessons/${quiz.lessonId}`}>Quay lại bài học</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{quiz.lesson.title} — Kết quả</h1>
      </div>

      <div
        className={`rounded-xl border p-6 ${
          attempt.passed ? "border-success/30 bg-success-bg" : "border-danger/30 bg-danger-bg"
        }`}
      >
        <p className="text-3xl font-semibold text-foreground">{attempt.scorePercent}%</p>
        <p className={`mt-1 flex items-center gap-1.5 ${attempt.passed ? "text-success" : "text-danger"}`}>
          {attempt.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {attempt.passed ? "Đạt" : "Chưa đạt"} (ngưỡng đạt: {attempt.passThreshold}%)
        </p>
      </div>

      <ul className="space-y-2">
        {questions.map((question, index) => {
          const result = answers[question.id];
          return (
            <li
              key={question.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm"
            >
              {result?.correct ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-danger" />
              )}
              <span className="text-foreground">
                {index + 1}. {question.text}
              </span>
            </li>
          );
        })}
      </ul>

      {attempt.passed ? (
        nextLesson ? (
          <Link
            href={`/dashboard/lessons/${nextLesson.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Bài tiếp theo
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href={`/dashboard/levels/${quiz.lesson.level}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Về danh sách bài học
            <ArrowRight className="h-4 w-4" />
          </Link>
        )
      ) : (
        <Link
          href={`/dashboard/quizzes/${quizId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          <RotateCcw className="h-4 w-4" />
          Làm lại bài test
        </Link>
      )}
    </div>
  );
}
