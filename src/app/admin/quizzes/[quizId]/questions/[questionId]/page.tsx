import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
        <Link href={`/admin/quizzes/${quizId}`} className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Sửa câu hỏi</h1>
      </div>
      <QuestionForm
        action={updateQuestionAction.bind(null, questionId)}
        initialText={question.text}
        initialOptions={question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))}
      />
    </div>
  );
}
