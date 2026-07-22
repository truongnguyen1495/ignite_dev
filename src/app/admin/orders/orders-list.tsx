"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, UserMinus, Loader2 } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatVND } from "@/lib/currency";
import { formatOrderCode, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR } from "@/lib/orders";
import { confirmOrderPaidAction, cancelOrderAction, revokeOrderItemAccessAction } from "./actions";

export type OrderListItem = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: number;
  createdAtLabel: string;
  studentName: string;
  studentEmail: string;
  items: { id: string; title: string; hasActiveGrant: boolean }[];
};

const STATUS_FILTERS: OrderStatus[] = ["PENDING", "PAID", "CANCELLED"];

function OrderActions({ order }: { order: OrderListItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  if (order.status !== "PENDING") return null;

  const onConfirm = async () => {
    const ok = await confirm({
      title: `Xác nhận đã nhận thanh toán cho ${formatOrderCode(order.orderNumber)}?`,
      description: `${order.studentName} sẽ được cấp quyền xem ngay sau khi xác nhận: ${order.items.map((i) => i.title).join(", ")}.`,
      confirmLabel: "Xác nhận đã thanh toán",
    });
    if (!ok) return;
    startTransition(async () => {
      await confirmOrderPaidAction(order.id);
      router.refresh();
    });
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: `Hủy đơn hàng ${formatOrderCode(order.orderNumber)}?`,
      description: "Học viên sẽ không được cấp quyền từ đơn này. Có thể mua lại sau nếu cần.",
      confirmLabel: "Hủy đơn",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await cancelOrderAction(order.id);
      router.refresh();
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onConfirm} title="Xác nhận đã thanh toán" className="hover:bg-success-bg hover:text-success">
        <Check className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onCancel} title="Hủy đơn" className="hover:bg-danger-bg hover:text-danger">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Only rendered for a PAID order's items that still have an active grant —
// lets an admin walk that back right here instead of hunting down the same
// row on the course/library detail page. Never touches the Order itself
// (stays "PAID" forever, see revokeOrderItemAccessAction).
function RevokeOrderItemButton({ order, itemId }: { order: OrderListItem; itemId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={pending}
      title="Thu hồi quyền truy cập"
      onClick={async () => {
        const ok = await confirm({
          title: `Thu hồi quyền từ đơn ${formatOrderCode(order.orderNumber)}?`,
          description: `${order.studentName} đã thanh toán ${formatVND(order.totalAmount)} cho đơn này. Thu hồi sẽ không tự hủy hay hoàn tiền đơn hàng.`,
          confirmLabel: "Thu hồi",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await revokeOrderItemAccessAction(itemId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  const [statusFilter, setStatusFilter] = useState<Set<OrderStatus>>(new Set());

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return orders;
    return orders.filter((o) => statusFilter.has(o.status));
  }, [orders, statusFilter]);

  function toggleStatus(status: OrderStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  if (orders.length === 0) {
    return <p className="text-sm text-muted">Chưa có đơn hàng nào.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatus(status)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              statusFilter.has(status)
                ? "border-primary-border-strong bg-primary-bg text-primary"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Không có đơn hàng nào khớp với bộ lọc đã chọn.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{formatOrderCode(order.orderNumber)}</p>
                  <Badge color={ORDER_STATUS_BADGE_COLOR[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
                      <span className="truncate">{item.title}</span>
                      {order.status === "PAID" && (
                        <>
                          <Badge color={item.hasActiveGrant ? "success" : "muted"}>
                            {item.hasActiveGrant ? "Còn hiệu lực" : "Đã thu hồi"}
                          </Badge>
                          {item.hasActiveGrant && <RevokeOrderItemButton order={order} itemId={item.id} />}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="truncate text-xs text-muted">
                  {order.studentName} · {order.studentEmail} · {order.createdAtLabel}
                </p>
              </div>
              <p className="shrink-0 font-medium text-foreground">{formatVND(order.totalAmount)}</p>
              <OrderActions order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
