"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLessonAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteLessonButton({
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
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={async () => {
        const ok = await confirm({
          title: `Xóa bài học "${lessonTitle}"?`,
          description: "Bài test đính kèm (nếu có) cũng sẽ bị xóa.",
          confirmLabel: "Xóa bài học",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteLessonAction(lessonId);
          router.push("/admin/lessons");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa bài học"}
    </Button>
  );
}
