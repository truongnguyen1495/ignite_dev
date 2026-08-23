"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVendorProductAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteVendorProductButton({ productId, productTitle }: { productId: string; productTitle: string }) {
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
          title: `Xóa sản phẩm "${productTitle}"?`,
          description: "Hành động này không thể hoàn tác.",
          confirmLabel: "Xóa sản phẩm",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteVendorProductAction(productId);
          router.push("/vendor/san-pham");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa sản phẩm"}
    </Button>
  );
}
