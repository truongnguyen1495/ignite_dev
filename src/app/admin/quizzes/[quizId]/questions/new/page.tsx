import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
        <Link href={`/admin/quizzes/${quizId}`} className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Thêm câu hỏi</h1>
      </div>
      <QuestionForm action={createQuestionAction.bind(null, quizId)} />
    </div>
  );
}
