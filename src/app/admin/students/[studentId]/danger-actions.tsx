"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteStudentAction, setStudentStatusAction, approveStudentAction } from "../actions";

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

export function ApproveStudentButton({
  studentId,
  iconOnly = false,
}: {
  studentId: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      await approveStudentAction(studentId);
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
        title="Duyệt đăng ký"
        className="hover:bg-success-bg hover:text-success"
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button type="button" disabled={pending} onClick={onClick}>
      {pending ? "Đang duyệt..." : "Duyệt đăng ký"}
    </Button>
  );
}

export function DeleteStudentButton({
  studentId,
  studentName,
  iconOnly = false,
  redirectAfter = false,
  pendingRegistration = false,
}: {
  studentId: string;
  studentName: string;
  iconOnly?: boolean;
  redirectAfter?: boolean;
  // Rendered for a not-yet-approved registration — same delete action under
  // the hood, but framed to the admin as "reject" rather than "delete".
  pendingRegistration?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm(
      pendingRegistration
        ? {
            title: `Từ chối đăng ký của "${studentName}"?`,
            description: "Tài khoản này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
            confirmLabel: "Từ chối đăng ký",
            tone: "danger",
          }
        : {
            title: `Xóa hẳn học viên "${studentName}"?`,
            description:
              "Toàn bộ điểm test và lịch sử xin lên cấp của học viên này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
            confirmLabel: "Xóa học viên",
            tone: "danger",
          }
    );
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
        title={pendingRegistration ? "Từ chối đăng ký" : "Xóa học viên"}
        className="hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button type="button" variant="danger" disabled={pending} onClick={onClick}>
      {pending ? "Đang xóa..." : pendingRegistration ? "Từ chối đăng ký" : "Xóa học viên"}
    </Button>
  );
}
