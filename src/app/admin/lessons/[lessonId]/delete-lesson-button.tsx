"use client";

import { useTransition } from "react";
import { deleteLessonAction } from "../actions";

export function DeleteLessonButton({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Xóa bài học "${lessonTitle}"? Bài test đính kèm (nếu có) cũng sẽ bị xóa.`)) {
          startTransition(() => {
            deleteLessonAction(lessonId);
          });
        }
      }}
      className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
    >
      {pending ? "Đang xóa..." : "Xóa bài học"}
    </button>
  );
}
