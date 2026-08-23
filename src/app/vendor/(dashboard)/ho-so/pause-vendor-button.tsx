"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVendorPauseAction } from "./actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PauseVendorButton({ paused }: { paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      isLoading={pending}
      className={paused ? "" : "border-warning text-warning hover:bg-warning-bg"}
      onClick={async () => {
        if (!paused) {
          const ok = await confirm({
            title: "Tạm ngừng gian hàng?",
            description: "Toàn bộ sản phẩm sẽ bị ẩn khỏi khách & học viên cho đến khi bạn bật lại.",
            confirmLabel: "Tạm ngừng bán",
          });
          if (!ok) return;
        }
        startTransition(async () => {
          await toggleVendorPauseAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Đang xử lý..." : paused ? "Bật lại gian hàng" : "Tạm ngừng bán"}
    </Button>
  );
}
