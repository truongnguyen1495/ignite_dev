"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
      title="Xóa"
      onClick={() => {
        if (confirm("Xóa câu hỏi này?")) {
          startTransition(async () => {
            await deleteQuestionAction(questionId, quizId);
            router.refresh();
          });
        }
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
