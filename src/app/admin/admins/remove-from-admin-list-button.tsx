"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { removeFromAdminListAction } from "./actions";

// Distinct from RevokeAllPermissionsButton (the shield icon) — that one
// keeps the row visible afterward with a Restore option; this one also
// hides it from this list entirely (hiddenFromAdminList), per explicit user
// request for a separate "xóa khỏi danh sách admin" control alongside the
// original shield icon, not replacing it.
export function RemoveFromAdminListButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({
          title: `Xóa "${adminName}" khỏi danh sách admin?`,
          description:
            "Tài khoản mất hết quyền admin và không còn hiện ở đây nữa. Muốn cấp lại thì tìm qua \"Thêm admin\".",
          confirmLabel: "Xóa khỏi danh sách",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await removeFromAdminListAction(adminId);
          router.refresh();
        });
      }}
      title="Xóa khỏi danh sách admin"
      className="shrink-0 hover:bg-danger-bg hover:text-danger"
    >
      <UserX className="h-4 w-4" />
    </Button>
  );
}
