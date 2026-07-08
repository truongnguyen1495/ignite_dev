"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCourseLessonAction } from "../actions";

export function DeleteCourseLessonInlineButton({
  lessonId,
  lessonTitle,
  courseId,
}: {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      title="Xóa bài học"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Xóa bài học "${lessonTitle}"?`)) {
          startTransition(async () => {
            await deleteCourseLessonAction(lessonId, courseId);
            router.refresh();
          });
        }
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
