"use client";

import { useTransition } from "react";
import { deleteQuizAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteQuizButton({
  quizId,
  lessonId,
}: {
  quizId: string;
  lessonId: string;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={async () => {
        const ok = await confirm({
          title: "Xóa bài test này?",
          description: "Toàn bộ câu hỏi và điểm test của học viên sẽ bị xóa.",
          confirmLabel: "Xóa bài test",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(() => {
          deleteQuizAction(quizId, lessonId);
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa bài test"}
    </Button>
  );
}
