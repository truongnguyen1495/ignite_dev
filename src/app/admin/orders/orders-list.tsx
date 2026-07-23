"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, UserMinus, Loader2, Truck, Trash2, RotateCcw } from "lucide-react";
import type { OrderItemKind, OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatVND } from "@/lib/currency";
import { formatOrderCode, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR, ORDER_TRASH_RETENTION_DAYS } from "@/lib/orders";
import {
  confirmOrderPaidAction,
  cancelOrderAction,
  revokeOrderItemAccessAction,
  restoreOrderItemAccessAction,
  deleteOrderAction,
  restoreOrderAction,
} from "./actions";

export type OrderListItem = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: number;
  createdAtLabel: string;
  studentName: string;
  studentEmail: string;
  shipping: { name: string; phone: string; address: string } | null;
  deletedAt: Date | null;
  items: { id: string; title: string; kind: OrderItemKind; hasActiveGrant: boolean }[];
};

const STATUS_FILTERS: OrderStatus[] = ["PENDING", "PAID", "CANCELLED"];

function OrderActions({ order }: { order: OrderListItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  if (order.status !== "PENDING") return null;

  const onConfirm = async () => {
    const hasProduct = order.items.some((i) => i.kind === "PRODUCT");
    const ok = await confirm({
      title: `Xác nhận đã nhận thanh toán cho ${formatOrderCode(order.orderNumber)}?`,
      description: (
        <div className="space-y-2">
          <p>
            {order.studentName} sẽ được xác nhận đã mua: {order.items.map((i) => i.title).join(", ")}.
            {hasProduct && " Sản phẩm vật lý sẽ không tự cấp quyền gì — nhớ sắp xếp giao hàng sau khi xác nhận."}
          </p>
          {order.shipping && (
            <p className="rounded-lg border border-border bg-surface-hover p-2 text-xs">
              Giao đến: {order.shipping.name} · {order.shipping.phone} · {order.shipping.address}
            </p>
          )}
        </div>
      ),
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

// Undo for RevokeOrderItemButton — re-grants access via
// restoreOrderItemAccessAction. Only rendered for a PAID, non-PRODUCT item
// that currently has no active grant (the mirror-image condition of
// RevokeOrderItemButton).
function RestoreOrderItemAccessButton({ order, itemId }: { order: OrderListItem; itemId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={pending}
      title="Trả lại quyền truy cập"
      onClick={async () => {
        const ok = await confirm({
          title: `Trả lại quyền cho đơn ${formatOrderCode(order.orderNumber)}?`,
          description: `${order.studentName} sẽ được cấp lại quyền truy cập như lúc đơn này được xác nhận thanh toán.`,
          confirmLabel: "Trả lại quyền",
          tone: "primary",
        });
        if (!ok) return;
        startTransition(async () => {
          await restoreOrderItemAccessAction(itemId);
          router.refresh();
        });
      }}
      className="hover:bg-success-bg hover:text-success"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Super-Admin-only per explicit design (see requireActiveSuperAdmin in
// deleteOrderAction) — rendered regardless of status, unlike OrderActions.
// Soft-delete: the order just disappears from this list right away, the row
// itself only gets purged after ORDER_TRASH_RETENTION_DAYS.
function DeleteOrderButton({ order }: { order: OrderListItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={pending}
      title="Xóa đơn hàng"
      onClick={async () => {
        const ok = await confirm({
          title: `Xóa đơn hàng ${formatOrderCode(order.orderNumber)}?`,
          description: `Đơn sẽ biến mất khỏi danh sách ngay, và bị xóa vĩnh viễn, hoàn toàn sau ${ORDER_TRASH_RETENTION_DAYS} ngày. Việc này không thu hồi quyền truy cập đã cấp (nếu có) — dùng nút thu hồi riêng nếu cần.`,
          confirmLabel: "Xóa đơn hàng",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteOrderAction(order.id);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

function daysLeft(deletedAt: Date): number {
  const purgeAt = new Date(deletedAt).getTime() + ORDER_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

function RestoreOrderButton({ order }: { order: OrderListItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: `Phục hồi đơn hàng ${formatOrderCode(order.orderNumber)}?`,
          description: "Đơn sẽ hiện lại bình thường trong danh sách đơn hàng.",
          confirmLabel: "Phục hồi",
          tone: "primary",
        });
        if (!ok) return;
        startTransition(async () => {
          await restoreOrderAction(order.id);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Phục hồi
    </Button>
  );
}

function DeletedOrdersList({ orders }: { orders: OrderListItem[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted">Không có đơn hàng nào trong thùng rác.</p>;
  }
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{formatOrderCode(order.orderNumber)}</p>
              <Badge color={ORDER_STATUS_BADGE_COLOR[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <p className="truncate text-sm text-foreground">{order.items.map((i) => i.title).join(", ")}</p>
            <p className="truncate text-xs text-muted">
              {order.studentName} · {order.studentEmail} · {order.createdAtLabel}
            </p>
            {order.deletedAt && (
              <p className="text-xs text-danger">
                Còn {daysLeft(order.deletedAt)} ngày trước khi bị xóa vĩnh viễn, hoàn toàn.
              </p>
            )}
          </div>
          <p className="shrink-0 font-medium text-foreground">{formatVND(order.totalAmount)}</p>
          <RestoreOrderButton order={order} />
        </li>
      ))}
    </ul>
  );
}

export function OrdersList({
  orders,
  deletedOrders,
  isSuperAdmin,
}: {
  orders: OrderListItem[];
  deletedOrders: OrderListItem[];
  isSuperAdmin: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<Set<OrderStatus>>(new Set());
  const [view, setView] = useState<"active" | "trash">("active");

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

  return (
    <div className="space-y-3">
      {isSuperAdmin && (
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              view === "active"
                ? "border-primary-border-strong bg-primary-bg text-primary"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            Đơn hàng
          </button>
          <button
            type="button"
            onClick={() => setView("trash")}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              view === "trash"
                ? "border-primary-border-strong bg-primary-bg text-primary"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            Đã xóa {deletedOrders.length > 0 && `(${deletedOrders.length})`}
          </button>
        </div>
      )}

      {view === "trash" ? (
        <DeletedOrdersList orders={deletedOrders} />
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted">Chưa có đơn hàng nào.</p>
      ) : (
        <>
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
                          {order.status === "PAID" && item.kind !== "PRODUCT" && (
                            <>
                              <Badge color={item.hasActiveGrant ? "success" : "muted"}>
                                {item.hasActiveGrant ? "Còn hiệu lực" : "Đã thu hồi"}
                              </Badge>
                              {item.hasActiveGrant ? (
                                <RevokeOrderItemButton order={order} itemId={item.id} />
                              ) : (
                                <RestoreOrderItemAccessButton order={order} itemId={item.id} />
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="truncate text-xs text-muted">
                      {order.studentName} · {order.studentEmail} · {order.createdAtLabel}
                    </p>
                    {order.shipping && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
                        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {order.shipping.name} · {order.shipping.phone} · {order.shipping.address}
                        </span>
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium text-foreground">{formatVND(order.totalAmount)}</p>
                  <OrderActions order={order} />
                  {isSuperAdmin && <DeleteOrderButton order={order} />}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
