"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { setAdminAccountStatusAction, deleteAdminAccountAction } from "../actions";

export function ToggleAdminStatusButton({ adminId, locked }: { adminId: string; locked: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setAdminAccountStatusAction(adminId, !locked);
          router.refresh();
        });
      }}
    >
      {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {pending ? "Đang xử lý..." : locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
    </Button>
  );
}

// Only rendered for adminOnly accounts — a dual-role admin is still a real
// student, so deleting that account stays exclusively /admin/students' call
// (deleteStudentAction), one place that decides a student can disappear.
export function DeleteAdminAccountButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Xóa hẳn tài khoản admin "${adminName}"?`,
      description: "Tài khoản này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
      confirmLabel: "Xóa tài khoản",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteAdminAccountAction(adminId);
    });
  };

  return (
    <Button type="button" variant="danger" disabled={pending} onClick={onClick}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Đang xóa..." : "Xóa tài khoản"}
    </Button>
  );
}
