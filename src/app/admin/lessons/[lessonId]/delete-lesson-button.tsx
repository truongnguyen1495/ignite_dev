"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLessonAction } from "../actions";
import { Button } from "@/components/ui/button";

export function DeleteLessonButton({
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
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={() => {
        if (confirm(`Xóa bài học "${lessonTitle}"? Bài test đính kèm (nếu có) cũng sẽ bị xóa.`)) {
          startTransition(async () => {
            await deleteLessonAction(lessonId);
            router.push("/admin/lessons");
          });
        }
      }}
    >
      {pending ? "Đang xóa..." : "Xóa bài học"}
    </Button>
  );
}
