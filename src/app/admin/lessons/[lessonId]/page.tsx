import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { EditLessonForm } from "./edit-lesson-form";
import { DeleteLessonButton } from "./delete-lesson-button";
import { createQuizForLessonAction } from "../../quizzes/actions";
import Link from "next/link";

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
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/lessons">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{lesson.title}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8">
        <EditLessonForm
          lessonId={lesson.id}
          title={lesson.title}
          level={lesson.level}
          content={lesson.content}
          youtubeId={lesson.youtubeId}
          order={lesson.order}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-sm font-semibold text-foreground">Bài test</h2>
        {lesson.quiz ? (
          <Link
            href={`/admin/quizzes/${lesson.quiz.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <ClipboardList className="h-4 w-4" />
            Quản lý bài test
          </Link>
        ) : (
          <form action={createQuizForLessonAction.bind(null, lesson.id)}>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              + Tạo bài test
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} />
      </div>
    </div>
  );
}
