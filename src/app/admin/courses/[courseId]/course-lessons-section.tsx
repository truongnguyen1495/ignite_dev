"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Video, Pencil } from "lucide-react";
import { CourseLessonForm } from "./lessons/course-lesson-form";
import { DeleteCourseLessonInlineButton } from "./delete-course-lesson-inline-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CourseLesson = {
  id: string;
  title: string;
  content: string;
  youtubeId: string | null;
  order: number;
};

const iconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

export function CourseLessonsSection({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: CourseLesson[];
}) {
  // "new" = the add-lesson form is expanded; a lesson id = that lesson's
  // card is expanded into an edit form; null = list is fully collapsed.
  const [expanded, setExpanded] = useState<"new" | string | null>(null);
  const router = useRouter();

  function collapseAndRefresh() {
    setExpanded(null);
    router.refresh();
  }

  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Bài học ({lessons.length})</h2>
        <Button
          type="button"
          size="sm"
          onClick={() => setExpanded(expanded === "new" ? null : "new")}
        >
          <Plus className="h-4 w-4" />
          Thêm bài học
        </Button>
      </div>

      {expanded === "new" && (
        <div className="rounded-lg border border-border bg-background p-4">
          <CourseLessonForm
            courseId={courseId}
            onSuccess={collapseAndRefresh}
            onCancel={() => setExpanded(null)}
          />
        </div>
      )}

      {lessons.length === 0 && expanded !== "new" ? (
        <p className="text-sm text-muted">Chưa có bài học nào.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              {expanded === lesson.id ? (
                <div className="rounded-lg border border-border bg-background p-4">
                  <CourseLessonForm
                    courseId={courseId}
                    lessonId={lesson.id}
                    title={lesson.title}
                    content={lesson.content}
                    youtubeId={lesson.youtubeId}
                    order={lesson.order}
                    onSuccess={collapseAndRefresh}
                    onCancel={() => setExpanded(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 hover:border-primary/50">
                  <button
                    type="button"
                    onClick={() => setExpanded(lesson.id)}
                    className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <span className="text-foreground">{lesson.title}</span>
                    {lesson.youtubeId && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Video className="h-3.5 w-3.5" />
                        Có video
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    title="Sửa"
                    onClick={() => setExpanded(lesson.id)}
                    className={iconButtonClass}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <DeleteCourseLessonInlineButton
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    courseId={courseId}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
