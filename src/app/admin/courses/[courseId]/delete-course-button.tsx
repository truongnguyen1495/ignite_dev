"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCourseAction } from "../actions";
import { Button } from "@/components/ui/button";

export function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={() => {
        if (
          confirm(
            `Xóa khóa học "${courseTitle}"? Toàn bộ bài học và quyền truy cập đã cấp cho học viên sẽ bị xóa vĩnh viễn.`
          )
        ) {
          startTransition(async () => {
            await deleteCourseAction(courseId);
            router.push("/admin/courses");
          });
        }
      }}
    >
      {pending ? "Đang xóa..." : "Xóa khóa học"}
    </Button>
  );
}
