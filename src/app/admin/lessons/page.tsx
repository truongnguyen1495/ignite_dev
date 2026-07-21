import Link from "next/link";
import { Plus, Video, FileText, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { ORDERED_LEVELS } from "@/lib/levels";
import { DeleteLessonInlineButton } from "./delete-lesson-inline-button";
import { createQuizForLessonAction } from "../quizzes/actions";
import { PageHeader } from "@/components/ui/page-header";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { LevelBadge } from "@/components/ui/level-badge";

export default async function LessonsPage() {
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");
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
        if (levelLessons.length === 0) {
          return (
            <div key={level} className="space-y-2">
              <LevelBadge level={level} full />
              <p className="text-sm text-muted">Chưa có bài học.</p>
            </div>
          );
        }
        return (
          <CollapsibleSection
            key={level}
            title={
              <span className="flex items-center gap-2">
                <LevelBadge level={level} full />
                <span className="text-xs text-muted">({levelLessons.length})</span>
              </span>
            }
          >
            <ul className="mt-2 space-y-2.5">
              {levelLessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-primary/50 hover:bg-surface-hover"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-bg text-primary">
                    {lesson.youtubeId ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </span>
                  <Link href={`/admin/lessons/${lesson.id}`} className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-foreground">{lesson.title}</span>
                    {lesson.description && (
                      <span className="truncate text-xs text-muted">{lesson.description}</span>
                    )}
                  </Link>
                  {lesson.quiz ? (
                    <Link
                      href={`/admin/quizzes/${lesson.quiz.id}`}
                      title="Soạn bài test"
                      className="flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Có bài test
                    </Link>
                  ) : (
                    <form action={createQuizForLessonAction.bind(null, lesson.id)}>
                      <button
                        type="submit"
                        title="Tạo và soạn bài test"
                        className="flex shrink-0 items-center gap-1 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning"
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
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
