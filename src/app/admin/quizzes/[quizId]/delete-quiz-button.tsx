"use client";

import { useTransition } from "react";
import { deleteQuizAction } from "../actions";
import { Button } from "@/components/ui/button";

export function DeleteQuizButton({
  quizId,
  lessonId,
}: {
  quizId: string;
  lessonId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={() => {
        if (confirm("Xóa bài test này? Toàn bộ câu hỏi và điểm test của học viên sẽ bị xóa.")) {
          startTransition(() => {
            deleteQuizAction(quizId, lessonId);
          });
        }
      }}
    >
      {pending ? "Đang xóa..." : "Xóa bài test"}
    </Button>
  );
}
