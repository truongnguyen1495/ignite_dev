"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLessonAction } from "./actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteLessonInlineButton({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Xóa bài học"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({
          title: `Xóa bài học "${lessonTitle}"?`,
          description: "Bài test đính kèm (nếu có) cũng sẽ bị xóa.",
          confirmLabel: "Xóa",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteLessonAction(lessonId);
          router.refresh();
        });
      }}
      className="shrink-0 hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
