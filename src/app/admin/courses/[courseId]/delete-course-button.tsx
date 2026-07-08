"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCourseAction } from "../actions";

export function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
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
      className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
    >
      {pending ? "Đang xóa..." : "Xóa khóa học"}
    </button>
  );
}
