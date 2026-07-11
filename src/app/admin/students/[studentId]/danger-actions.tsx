"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2, CheckCircle2 } from "lucide-react";
import type { User } from "@prisma/client";
import { formatDateOnlyVN } from "@/lib/date";
import { LEVEL_LABELS } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteStudentAction, setStudentStatusAction, approveStudentAction } from "../actions";

type PendingStudentInfo = Pick<
  User,
  "id" | "name" | "email" | "username" | "dateOfBirth" | "phoneNumber" | "createdAt" | "grantedLevel"
>;

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
  student,
  iconOnly = false,
}: {
  student: PendingStudentInfo;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Duyệt đăng ký của "${student.name}"?`,
      description: (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Email</dt>
            <dd className="break-words text-foreground">{student.email}</dd>
          </div>
          {student.username && (
            <div className="min-w-0">
              <dt className="text-xs text-muted">Username</dt>
              <dd className="break-words text-foreground">@{student.username}</dd>
            </div>
          )}
          {student.dateOfBirth && (
            <div className="min-w-0">
              <dt className="text-xs text-muted">Ngày sinh</dt>
              <dd className="text-foreground">{formatDateOnlyVN(student.dateOfBirth)}</dd>
            </div>
          )}
          {student.phoneNumber && (
            <div className="min-w-0">
              <dt className="text-xs text-muted">Số điện thoại</dt>
              <dd className="break-words text-foreground">{student.phoneNumber}</dd>
            </div>
          )}
          <div className="min-w-0">
            <dt className="text-xs text-muted">Ngày đăng ký</dt>
            <dd className="text-foreground">{student.createdAt.toLocaleDateString("vi-VN")}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Cấp được cấp quyền</dt>
            <dd className="text-foreground">
              {student.grantedLevel ? LEVEL_LABELS[student.grantedLevel] : "Chưa xếp cấp"}
            </dd>
          </div>
        </dl>
      ),
      confirmLabel: "Xác nhận, duyệt đăng ký",
      tone: "primary",
    });
    if (!ok) return;
    startTransition(async () => {
      await approveStudentAction(student.id);
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
