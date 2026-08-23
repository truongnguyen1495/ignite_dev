"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVendorLibraryItemAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteVendorLibraryItemButton({ libraryItemId, title }: { libraryItemId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={async () => {
        const ok = await confirm({
          title: `Xóa "${title}"?`,
          description: "Hành động này không thể hoàn tác.",
          confirmLabel: "Xóa",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteVendorLibraryItemAction(libraryItemId);
          router.push("/vendor/san-pham");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa"}
    </Button>
  );
}
