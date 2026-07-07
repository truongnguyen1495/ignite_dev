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
      className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
    >
      {pending ? "Đang xóa..." : "Xóa bài test"}
    </button>
  );
}
