"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteQuestionAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteQuestionButton({
  questionId,
  quizId,
}: {
  questionId: string;
  quizId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Xóa"
      onClick={async () => {
        const ok = await confirm({ title: "Xóa câu hỏi này?", confirmLabel: "Xóa", tone: "danger" });
        if (!ok) return;
        startTransition(async () => {
          await deleteQuestionAction(questionId, quizId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
