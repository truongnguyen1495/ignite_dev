import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, CheckCircle2, Circle, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { QuizTitleForm } from "./quiz-title-form";
import { DeleteQuestionButton } from "./delete-question-button";
import { DeleteQuizButton } from "./delete-quiz-button";
import { Card } from "@/components/ui/card";

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
        <BackLink href={`/admin/lessons/${quiz.lessonId}`}>{quiz.lesson.title}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{quiz.title}</h1>
      </div>

      <Card className="max-w-xl">
        <QuizTitleForm quizId={quiz.id} title={quiz.title} />
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted">Câu hỏi ({quiz.questions.length})</h2>
          <Link
            href={`/admin/quizzes/${quiz.id}/questions/new`}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm câu hỏi
          </Link>
        </div>

        {quiz.questions.length === 0 ? (
          <p className="text-sm text-muted">Chưa có câu hỏi nào.</p>
        ) : (
          <ul className="space-y-3">
            {quiz.questions.map((question, index) => (
              <li key={question.id}>
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-foreground">
                      {index + 1}. {question.text}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        href={`/admin/quizzes/${quiz.id}/questions/${question.id}`}
                        title="Sửa"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteQuestionButton questionId={question.id} quizId={quiz.id} />
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {question.options.map((option) => (
                      <li key={option.id} className="flex items-center gap-2">
                        {option.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted" />
                        )}
                        <span className={option.isCorrect ? "font-medium text-foreground" : "text-muted"}>
                          {option.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteQuizButton quizId={quiz.id} lessonId={quiz.lessonId} />
      </Card>
    </div>
  );
}
