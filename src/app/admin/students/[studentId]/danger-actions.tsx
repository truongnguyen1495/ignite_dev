"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { deleteStudentAction, setStudentStatusAction } from "../actions";

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50";
const iconButtonDangerClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50";

export function ToggleStudentStatusButton({
  studentId,
  locked,
  iconOnly = false,
}: {
  studentId: string;
  locked: boolean;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      await setStudentStatusAction(studentId, !locked);
      router.refresh();
    });
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        title={locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
        className={iconButtonClass}
      >
        {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
    >
      {pending ? "Đang xử lý..." : locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
    </button>
  );
}

export function DeleteStudentButton({
  studentId,
  studentName,
  iconOnly = false,
  redirectAfter = false,
}: {
  studentId: string;
  studentName: string;
  iconOnly?: boolean;
  redirectAfter?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (
      !confirm(
        `Xóa hẳn học viên "${studentName}"? Toàn bộ điểm test và lịch sử xin lên cấp của học viên này sẽ bị xóa vĩnh viễn và không thể khôi phục.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteStudentAction(studentId);
      if (redirectAfter) {
        router.push("/admin/students");
      } else {
        router.refresh();
      }
    });
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        title="Xóa học viên"
        className={iconButtonDangerClass}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
    >
      {pending ? "Đang xóa..." : "Xóa học viên"}
    </button>
  );
}
