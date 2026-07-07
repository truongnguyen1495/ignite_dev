import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuizTitleForm } from "./quiz-title-form";
import { DeleteQuestionButton } from "./delete-question-button";
import { DeleteQuizButton } from "./delete-quiz-button";

export default async function QuizManagementPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: true,
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!quiz) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/lessons/${quiz.lessonId}`} className="text-sm text-zinc-500 hover:underline">
          ← {quiz.lesson.title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{quiz.title}</h1>
      </div>

      <QuizTitleForm quizId={quiz.id} title={quiz.title} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-500">Câu hỏi ({quiz.questions.length})</h2>
          <Link
            href={`/admin/quizzes/${quiz.id}/questions/new`}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            + Thêm câu hỏi
          </Link>
        </div>

        {quiz.questions.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa có câu hỏi nào.</p>
        ) : (
          <ul className="space-y-3">
            {quiz.questions.map((question, index) => (
              <li key={question.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">
                    {index + 1}. {question.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/admin/quizzes/${quiz.id}/questions/${question.id}`}
                      className="text-sm text-zinc-500 hover:underline"
                    >
                      Sửa
                    </Link>
                    <DeleteQuestionButton questionId={question.id} quizId={quiz.id} />
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {question.options.map((option) => (
                    <li key={option.id} className="flex items-center gap-2">
                      <span aria-hidden>{option.isCorrect ? "✅" : "⬜"}</span>
                      <span className={option.isCorrect ? "font-medium" : "text-zinc-500"}>
                        {option.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-xl space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Khu vực nguy hiểm</h2>
        <DeleteQuizButton quizId={quiz.id} lessonId={quiz.lessonId} />
      </div>
    </div>
  );
}
