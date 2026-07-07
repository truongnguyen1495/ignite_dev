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
      className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
    >
      {pending ? "Đang xóa..." : "Xóa bài học"}
    </button>
  );
}
