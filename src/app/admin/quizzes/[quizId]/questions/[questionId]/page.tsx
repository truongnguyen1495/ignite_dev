import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { QuestionForm } from "../../question-form";
import { updateQuestionAction } from "../../../actions";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ quizId: string; questionId: string }>;
}) {
  const { quizId, questionId } = await params;
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!question || question.quizId !== quizId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/admin/quizzes/${quizId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Sửa câu hỏi</h1>
      </div>
      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <QuestionForm
          action={updateQuestionAction.bind(null, questionId)}
          initialText={question.text}
          initialOptions={question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))}
        />
      </div>
    </div>
  );
}
