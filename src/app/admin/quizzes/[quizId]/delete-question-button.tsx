"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestionAction } from "../actions";

export function DeleteQuestionButton({
  questionId,
  quizId,
}: {
  questionId: string;
  quizId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Xóa câu hỏi này?")) {
          startTransition(async () => {
            await deleteQuestionAction(questionId, quizId);
            router.refresh();
          });
        }
      }}
      className="text-sm text-red-600 disabled:opacity-50"
    >
      {pending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
