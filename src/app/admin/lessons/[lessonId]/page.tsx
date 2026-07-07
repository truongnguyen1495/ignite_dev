import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditLessonForm } from "./edit-lesson-form";
import { DeleteLessonButton } from "./delete-lesson-button";
import { createQuizForLessonAction } from "../../quizzes/actions";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { quiz: true },
  });
  if (!lesson) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/lessons" className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{lesson.title}</h1>
      </div>

      <EditLessonForm
        lessonId={lesson.id}
        title={lesson.title}
        level={lesson.level}
        content={lesson.content}
        youtubeId={lesson.youtubeId}
        order={lesson.order}
      />

      <div className="max-w-xl space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Bài test</h2>
        {lesson.quiz ? (
          <Link
            href={`/admin/quizzes/${lesson.quiz.id}`}
            className="inline-block rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Quản lý bài test →
          </Link>
        ) : (
          <form action={createQuizForLessonAction.bind(null, lesson.id)}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
            >
              + Tạo bài test
            </button>
          </form>
        )}
      </div>

      <div className="max-w-xl space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Khu vực nguy hiểm</h2>
        <DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} />
      </div>
    </div>
  );
}
