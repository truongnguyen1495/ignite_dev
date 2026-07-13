"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatOrderCode } from "@/lib/orders";
import { cancelMyOrderAction } from "../actions";

export function CancelOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onCancel = async () => {
    const ok = await confirm({
      title: `Hủy đơn hàng ${formatOrderCode(orderNumber)}?`,
      description: "Bạn có thể đặt mua lại sau nếu cần.",
      confirmLabel: "Hủy đơn",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await cancelMyOrderAction(orderId);
      router.refresh();
    });
  };

  return (
    <Button type="button" variant="danger" isLoading={pending} onClick={onCancel}>
      Hủy đơn hàng
    </Button>
  );
}
