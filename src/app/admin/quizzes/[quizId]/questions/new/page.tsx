import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { QuestionForm } from "../../question-form";
import { createQuestionAction } from "../../../actions";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/admin/quizzes/${quizId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm câu hỏi</h1>
      </div>
      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <QuestionForm action={createQuestionAction.bind(null, quizId)} />
      </div>
    </div>
  );
}
