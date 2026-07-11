"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteStudentAction, demoteStudentAction, setStudentStatusAction } from "../actions";

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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={onClick}
        title={locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
      >
        {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={onClick}>
      {pending ? "Đang xử lý..." : locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
    </Button>
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
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Xóa hẳn học viên "${studentName}"?`,
      description:
        "Toàn bộ điểm test và lịch sử xin lên cấp của học viên này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
      confirmLabel: "Xóa học viên",
      tone: "danger",
    });
    if (!ok) return;
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={onClick}
        title="Xóa học viên"
        className="hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button type="button" variant="danger" disabled={pending} onClick={onClick}>
      {pending ? "Đang xóa..." : "Xóa học viên"}
    </Button>
  );
}

export function DemoteStudentButton({
  studentId,
  studentName,
  iconOnly = false,
}: {
  studentId: string;
  studentName: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Đẩy "${studentName}" về học sinh?`,
      description:
        "Học viên sẽ mất cấp hiện tại và quay về tài khoản học sinh (chưa xếp cấp) — không vào được bài học/quiz 5 cấp hay chat cho đến khi được duyệt tham gia lại.",
      confirmLabel: "Đẩy về học sinh",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await demoteStudentAction(studentId);
      router.refresh();
    });
  };

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={onClick}
        title="Đẩy về học sinh"
        className="hover:bg-warning-bg hover:text-warning"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={onClick}>
      {pending ? "Đang xử lý..." : "Đẩy về học sinh"}
    </Button>
  );
}
