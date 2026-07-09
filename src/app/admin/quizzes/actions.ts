"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Question, AnswerOption } from "@prisma/client";

export async function createQuizForLessonAction(lessonId: string) {
  await requireActiveSuperAdmin();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const quiz = await prisma.quiz.create({
    data: { lessonId, title: `Bài test: ${lesson.title}` },
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(`/admin/quizzes/${quiz.id}`);
}

export async function deleteQuizAction(quizId: string, lessonId: string) {
  await requireActiveSuperAdmin();
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(`/admin/lessons/${lessonId}`);
}

export type QuestionInput = {
  id: string | null;
  text: string;
  options: { text: string; isCorrect: boolean }[];
};

export type SavedQuestion = Question & { options: AnswerOption[] };

// Saves the quiz title and every question (new + edited) in one transaction —
// the editor keeps all of this as in-memory drafts and only calls this once,
// on "Lưu bài viết". Deleting a question is intentionally NOT part of this
// (see deleteQuestionAction below) — it stays an immediate, separate action
// since it's destructive and already confirmed via a dialog before the
// editor ever calls it.
export async function saveQuizAction(
  quizId: string,
  title: string,
  questions: QuestionInput[]
): Promise<{ error?: string; title?: string; questions?: SavedQuestion[] }> {
  await requireActiveSuperAdmin();

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { error: "Tiêu đề không được để trống." };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text.trim()) {
      return { error: `Câu hỏi ${i + 1}: nội dung không được để trống.` };
    }
    if (q.options.length < 2) {
      return { error: `Câu hỏi ${i + 1}: cần ít nhất 2 đáp án.` };
    }
    if (q.options.some((o) => !o.text.trim())) {
      return { error: `Câu hỏi ${i + 1}: đáp án không được để trống.` };
    }
    if (!q.options.some((o) => o.isCorrect)) {
      return { error: `Câu hỏi ${i + 1}: phải chọn ít nhất một đáp án đúng.` };
    }
  }

  const savedQuestions = await prisma.$transaction(async (tx) => {
    await tx.quiz.update({ where: { id: quizId }, data: { title: trimmedTitle } });

    const results: SavedQuestion[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const optionsData = q.options.map((o, j) => ({
        text: o.text.trim(),
        isCorrect: o.isCorrect,
        order: j,
      }));

      if (q.id) {
        await tx.answerOption.deleteMany({ where: { questionId: q.id } });
        const updated = await tx.question.update({
          where: { id: q.id },
          data: { text: q.text.trim(), order: i, options: { create: optionsData } },
          include: { options: { orderBy: { order: "asc" } } },
        });
        results.push(updated);
      } else {
        const created = await tx.question.create({
          data: { quizId, text: q.text.trim(), order: i, options: { create: optionsData } },
          include: { options: { orderBy: { order: "asc" } } },
        });
        results.push(created);
      }
    }
    return results;
  });

  revalidatePath(`/admin/quizzes/${quizId}`);
  revalidatePath("/admin/lessons");
  return { title: trimmedTitle, questions: savedQuestions };
}

export async function deleteQuestionAction(questionId: string, quizId: string) {
  await requireActiveSuperAdmin();
  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/admin/quizzes/${quizId}`);
}
