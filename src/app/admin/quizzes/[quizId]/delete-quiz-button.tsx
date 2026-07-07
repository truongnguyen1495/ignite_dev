"use client";

import { useTransition } from "react";
import { deleteQuizAction } from "../actions";

export function DeleteQuizButton({
  quizId,
  lessonId,
}: {
  quizId: string;
  lessonId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Xóa bài test này? Toàn bộ câu hỏi và điểm test của học viên sẽ bị xóa.")) {
          startTransition(() => {
            deleteQuizAction(quizId, lessonId);
          });
        }
      }}
      className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
    >
      {pending ? "Đang xóa..." : "Xóa bài test"}
    </button>
  );
}
