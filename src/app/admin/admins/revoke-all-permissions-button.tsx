"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { setAccountPermissionsAction } from "./actions";

export function RevokeAllPermissionsButton({
  adminId,
  adminName,
  adminOnly,
}: {
  adminId: string;
  adminName: string;
  adminOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: `Thu hồi toàn bộ quyền của "${adminName}"?`,
      description:
        "Tài khoản này sẽ mất hết mọi quyền admin đang có, không còn truy cập được /admin nữa (trừ khi được cấp lại từ đầu).",
      confirmLabel: "Thu hồi toàn bộ",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await setAccountPermissionsAction(adminId, [], adminOnly);
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={onClick}
      title="Thu hồi toàn bộ quyền admin"
      className="shrink-0 hover:bg-danger-bg hover:text-danger"
    >
      <ShieldOff className="h-4 w-4" />
    </Button>
  );
}
