"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCourseAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
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
          title: `Xóa khóa học "${courseTitle}"?`,
          description: "Toàn bộ bài học và quyền truy cập đã cấp cho học viên sẽ bị xóa vĩnh viễn.",
          confirmLabel: "Xóa khóa học",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteCourseAction(courseId);
          router.push("/admin/courses");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa khóa học"}
    </Button>
  );
}
