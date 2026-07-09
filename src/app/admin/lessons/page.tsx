import Link from "next/link";
import { Plus, Video, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { DeleteLessonInlineButton } from "./delete-lesson-inline-button";
import { createQuizForLessonAction } from "../quizzes/actions";
import { PageHeader } from "@/components/ui/page-header";

export default async function LessonsPage() {
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { quiz: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bài học"
        actions={
          <Link
            href="/admin/lessons/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm bài học
          </Link>
        }
      />

      {ORDERED_LEVELS.map((level) => {
        const levelLessons = lessons.filter((l) => l.level === level);
        return (
          <div key={level} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">{LEVEL_LABELS[level]}</h2>
            {levelLessons.length === 0 ? (
              <p className="text-sm text-muted">Chưa có bài học.</p>
            ) : (
              <ul className="space-y-2">
                {levelLessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 hover:border-primary/50"
                  >
                    <Link
                      href={`/admin/lessons/${lesson.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-foreground">{lesson.title}</span>
                          {lesson.youtubeId && <Video className="h-3.5 w-3.5 shrink-0 text-muted" />}
                        </span>
                        {lesson.description && (
                          <span className="block truncate text-xs text-muted">{lesson.description}</span>
                        )}
                      </span>
                    </Link>
                    {lesson.quiz ? (
                      <Link
                        href={`/admin/quizzes/${lesson.quiz.id}`}
                        title="Soạn bài test"
                        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Có bài test
                      </Link>
                    ) : (
                      <form action={createQuizForLessonAction.bind(null, lesson.id)}>
                        <button
                          type="submit"
                          title="Tạo và soạn bài test"
                          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Chưa có bài test
                        </button>
                      </form>
                    )}
                    <DeleteLessonInlineButton lessonId={lesson.id} lessonTitle={lesson.title} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
