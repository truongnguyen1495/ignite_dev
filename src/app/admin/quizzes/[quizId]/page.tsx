import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { QuizEditor } from "./quiz-editor";
import { DeleteQuizButton } from "./delete-quiz-button";
import { Card } from "@/components/ui/card";

export default async function QuizManagementPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");
  const { quizId } = await params;
  const [quiz, settings] = await Promise.all([
    prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: true,
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, passPercentage: 80 } }),
  ]);
  if (!quiz) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <QuizEditor
        quizId={quiz.id}
        title={quiz.title}
        lessonId={quiz.lessonId}
        lessonTitle={quiz.lesson.title}
        questions={quiz.questions}
        passThreshold={quiz.passThreshold}
        defaultPassPercentage={settings.passPercentage}
      />

      <Card className="max-w-xl space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteQuizButton quizId={quiz.id} lessonId={quiz.lessonId} />
      </Card>
    </div>
  );
}
