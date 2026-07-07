import Link from "next/link";
import { requireQuizAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { submitQuizAttemptAction } from "../actions";

export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;

  // requireQuizAccess re-derives the quiz's lesson level and checks it
  // against the student's grantedLevel, fetched fresh from the DB — this is
  // what blocks direct-URL access to a quiz above the student's level.
  const { quiz } = await requireQuizAccess(quizId);

  const questions = await prisma.question.findMany({
    where: { quizId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/lessons/${quiz.lessonId}`} className="text-sm text-zinc-500 hover:underline">
          ← Quay lại bài học
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{quiz.title}</h1>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-zinc-500">Bài test này chưa có câu hỏi.</p>
      ) : (
        <form action={submitQuizAttemptAction.bind(null, quiz.id)} className="space-y-6">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <legend className="px-1 font-medium">
                {index + 1}. {question.text}
              </legend>
              <div className="mt-2 space-y-2">
                {question.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={`answer-${question.id}`} value={option.id} className="h-4 w-4" />
                    {option.text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Nộp bài
          </button>
        </form>
      )}
    </div>
  );
}
