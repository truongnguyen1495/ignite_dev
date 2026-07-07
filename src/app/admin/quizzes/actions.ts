"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function createQuizForLessonAction(lessonId: string) {
  await requireActiveSuperAdmin();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const quiz = await prisma.quiz.create({
    data: { lessonId, title: `Bài test: ${lesson.title}` },
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(`/admin/quizzes/${quiz.id}`);
}

const titleSchema = z.object({
  quizId: z.string().min(1),
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
});

export async function updateQuizTitleAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();
  const parsed = titleSchema.safeParse({
    quizId: formData.get("quizId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  await prisma.quiz.update({
    where: { id: parsed.data.quizId },
    data: { title: parsed.data.title },
  });
  revalidatePath("/admin/lessons");
  redirect("/admin/lessons");
}

export async function deleteQuizAction(quizId: string, lessonId: string) {
  await requireActiveSuperAdmin();
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(`/admin/lessons/${lessonId}`);
}

const questionSchema = z.object({
  text: z.string().trim().min(1, "Nội dung câu hỏi không được để trống."),
  optionText: z
    .array(z.string().trim().min(1, "Đáp án không được để trống."))
    .min(2, "Cần ít nhất 2 đáp án."),
  optionCorrect: z.array(z.string()),
});

export async function createQuestionAction(
  quizId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    optionText: formData.getAll("optionText"),
    optionCorrect: formData.getAll("optionCorrect"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const correctIndexes = new Set(parsed.data.optionCorrect.map(Number));
  if (correctIndexes.size === 0) {
    return "Phải chọn ít nhất một đáp án đúng.";
  }

  const lastQuestion = await prisma.question.findFirst({
    where: { quizId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastQuestion?.order ?? -1) + 1;

  await prisma.question.create({
    data: {
      quizId,
      text: parsed.data.text,
      order: nextOrder,
      options: {
        create: parsed.data.optionText.map((text, i) => ({
          text,
          isCorrect: correctIndexes.has(i),
          order: i,
        })),
      },
    },
  });

  revalidatePath(`/admin/quizzes/${quizId}`);
  redirect(`/admin/quizzes/${quizId}`);
}

export async function updateQuestionAction(
  questionId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    optionText: formData.getAll("optionText"),
    optionCorrect: formData.getAll("optionCorrect"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const correctIndexes = new Set(parsed.data.optionCorrect.map(Number));
  if (correctIndexes.size === 0) {
    return "Phải chọn ít nhất một đáp án đúng.";
  }

  const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });

  await prisma.$transaction([
    prisma.answerOption.deleteMany({ where: { questionId } }),
    prisma.question.update({
      where: { id: questionId },
      data: {
        text: parsed.data.text,
        options: {
          create: parsed.data.optionText.map((text, i) => ({
            text,
            isCorrect: correctIndexes.has(i),
            order: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/quizzes/${question.quizId}`);
  redirect(`/admin/quizzes/${question.quizId}`);
}

export async function deleteQuestionAction(questionId: string, quizId: string) {
  await requireActiveSuperAdmin();
  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/admin/quizzes/${quizId}`);
}
