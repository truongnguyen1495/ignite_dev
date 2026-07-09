"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLessonAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteLessonInlineButton({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Xóa bài học"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Xóa bài học "${lessonTitle}"? Bài test đính kèm (nếu có) cũng sẽ bị xóa.`)) {
          startTransition(async () => {
            await deleteLessonAction(lessonId);
            router.refresh();
          });
        }
      }}
      className="shrink-0 hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
