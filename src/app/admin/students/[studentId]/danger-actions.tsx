"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStudentAction, setStudentStatusAction } from "../actions";

export function ToggleStudentStatusButton({
  studentId,
  locked,
}: {
  studentId: string;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setStudentStatusAction(studentId, !locked);
          router.refresh();
        });
      }}
      className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
    >
      {pending ? "Đang xử lý..." : locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
    </button>
  );
}

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Xóa hẳn học viên "${studentName}"? Toàn bộ điểm test và lịch sử xin lên cấp của học viên này sẽ bị xóa vĩnh viễn và không thể khôi phục.`
          )
        ) {
          startTransition(() => {
            deleteStudentAction(studentId);
          });
        }
      }}
      className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
    >
      {pending ? "Đang xóa..." : "Xóa học viên"}
    </button>
  );
}
