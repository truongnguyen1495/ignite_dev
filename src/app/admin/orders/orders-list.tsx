"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  UserMinus,
  Loader2,
  Truck,
  Trash2,
  RotateCcw,
  Package,
  Undo2,
  Image as ImageIcon,
} from "lucide-react";
import type { OrderCancelReason, OrderItemKind, OrderStatus, PaymentMethod } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatVND } from "@/lib/currency";
import {
  formatOrderCode,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_COLOR,
  ORDER_TRASH_RETENTION_DAYS,
} from "@/lib/orders";
import { ORDER_CANCEL_REASON_LABELS } from "@/lib/order-cancel-labels";
import { getOrderActionFlags, ORDER_PRIMARY_ACTION_LABELS } from "@/lib/order-action-flags";
import { CancelOrderModal } from "./cancel-order-modal";
import {
  ShipOrderModal,
  DeliverOrderModal,
  RefundOrderModal,
  ConfirmPaymentModal,
} from "./order-fulfilment-modals";
import {
  reviveOrderAction,
  revokeOrderItemAccessAction,
  restoreOrderItemAccessAction,
  deleteOrderAction,
  restoreOrderAction,
} from "./actions";

export type OrderListItem = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  cancelReason: OrderCancelReason | null;
  totalAmount: number;
  refundedTotal: number;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  carrier: string | null;
  trackingCode: string | null;
  hasPaymentProof: boolean;
  createdAtLabel: string;
  studentName: string;
  studentEmail: string;
  shipping: { name: string; phone: string; address: string } | null;
  deletedAt: Date | null;
  items: { id: string; title: string; kind: OrderItemKind; hasActiveGrant: boolean }[];
};

const STATUS_FILTERS: OrderStatus[] = ["PENDING", "AWAITING_COD", "PAID", "CANCELLED"];

function OrderActions({ order }: { order: OrderListItem }) {
  const [pending, startTransition] = useTransition();
  const [openModal, setOpenModal] = useState<"confirm" | "cancel" | "ship" | "deliver" | "refund" | null>(null);
  const router = useRouter();
  const confirm = useConfirm();

  // One source for "what can this order do" — the same function the buyer's
  // page reads, so the two never describe the same order differently.
  const flags = getOrderActionFlags({
    status: order.status,
    paymentMethod: order.paymentMethod,
    cancelReason: order.cancelReason,
    hasPhysicalItems: order.items.some((i) => i.kind === "PRODUCT"),
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    totalAmount: order.totalAmount,
    refundedTotal: order.refundedTotal,
  });

  const runConfirmed = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const onRevive = async () => {
    const ok = await confirm({
      title: `Mở lại đơn ${formatOrderCode(order.orderNumber)}?`,
      description: `Đơn này hệ thống tự hủy do quá hạn thanh toán. Mở lại sẽ tính là đã thanh toán và cấp quyền ngay cho ${order.studentName} — chỉ làm khi bạn đã thấy tiền về.`,
      confirmLabel: "Đã nhận được tiền",
    });
    if (ok) runConfirmed(() => reviveOrderAction(order.id));
  };

  // Exactly one primary action, chosen by the order's own timeline; anything
  // else it can still do sits beside it as a quieter icon.
  const primaryButton = (() => {
    switch (flags.primary) {
      case "confirm-bank":
      case "confirm-cod":
        return (
          <Button type="button" size="sm" disabled={pending} onClick={() => setOpenModal("confirm")} className="whitespace-nowrap">
            <Check className="h-3.5 w-3.5" />
            {ORDER_PRIMARY_ACTION_LABELS[flags.primary]}
          </Button>
        );
      case "ship":
        return (
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => setOpenModal("ship")} className="whitespace-nowrap">
            <Truck className="h-3.5 w-3.5" />
            Đã gửi hàng
          </Button>
        );
      case "deliver":
        return (
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => setOpenModal("deliver")} className="whitespace-nowrap">
            <Package className="h-3.5 w-3.5" />
            Đã giao
          </Button>
        );
      case "revive":
        return (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onRevive}
            title="Đơn quá hạn — mở lại nếu tiền đã về"
            className="whitespace-nowrap border-accent-border text-accent-foreground hover:bg-accent-bg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Đã nhận được tiền
          </Button>
        );
      default:
        return null;
    }
  })();

  if (!primaryButton && !flags.canCancel && !flags.canRefund) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {primaryButton}
      {flags.canRefund && (
        <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={() => setOpenModal("refund")} title="Hoàn tiền" className="hover:bg-danger-bg hover:text-danger">
          <Undo2 className="h-4 w-4" />
        </Button>
      )}
      {flags.canCancel && (
        <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={() => setOpenModal("cancel")} title="Hủy đơn" className="hover:bg-danger-bg hover:text-danger">
          <X className="h-4 w-4" />
        </Button>
      )}

      {openModal === "confirm" && (
        <ConfirmPaymentModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          studentName={order.studentName}
          amountLabel={formatVND(order.totalAmount)}
          isCod={flags.isCod}
          itemTitles={order.items.map((i) => i.title).join(", ")}
          shippingLine={
            order.shipping
              ? `${order.shipping.name} · ${order.shipping.phone} · ${order.shipping.address}`
              : null
          }
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "cancel" && (
        <CancelOrderModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          studentName={order.studentName}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "ship" && (
        <ShipOrderModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          shippingAddress={order.shipping?.address ?? null}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "deliver" && (
        <DeliverOrderModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          isCod={flags.isCod}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "refund" && (
        <RefundOrderModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          refundableAmount={order.totalAmount - order.refundedTotal}
          onClose={() => setOpenModal(null)}
        />
      )}
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
              {/* Recording the reason is only worth doing if it's visible
                  where the admin actually looks — this row, not a detail
                  view nobody opens. */}
              {order.cancelReason && (
                <span className="text-xs text-muted">
                  {ORDER_CANCEL_REASON_LABELS[order.cancelReason]}
                </span>
              )}
              {/* Opens in a new tab rather than inline: the route is
                  admin-gated and returns raw bytes, so it behaves like any
                  other private file link in this app. */}
              {order.hasPaymentProof && (
                <a
                  href={`/api/admin/orders/${order.id}/proof`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
                >
                  <ImageIcon className="h-3 w-3" />
                  Ảnh chứng từ
                </a>
              )}
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
