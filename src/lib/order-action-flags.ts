import type { OrderCancelReason, OrderStatus, PaymentMethod } from "@prisma/client";
import { isOpenOrder } from "@/lib/orders";
import { isAutoCancelledOrder } from "@/lib/order-cancel-labels";

// Client-safe on purpose (no "server-only"): the same rules decide what the
// row in /admin/orders offers and what the buyer's own page says is
// happening. Before this file the conditions lived inline in JSX, so adding
// one action meant remembering every place that had to agree with it.
//
// These are DISPLAY rules only. Every real constraint lives inside the
// updateMany of the matching Server Action, which is atomic and can't be
// bypassed — an action is a public POST, so a hidden button is never a
// permission.

export type OrderPrimaryAction =
  | "confirm-bank"
  | "confirm-cod"
  | "ship"
  | "deliver"
  | "revive"
  | null;

export type OrderActionInput = {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  cancelReason: OrderCancelReason | null;
  hasPhysicalItems: boolean;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  totalAmount: number;
  refundedTotal: number;
};

export type OrderActionFlags = {
  isCod: boolean;
  isOpen: boolean;
  canShip: boolean;
  canDeliver: boolean;
  canRevive: boolean;
  canRefund: boolean;
  canCancel: boolean;
  /** Every đồng already given back — nothing left to ship or refund. */
  isFullyRefunded: boolean;
  /** The single next thing to do, by the order's own timeline. */
  primary: OrderPrimaryAction;
};

export function getOrderActionFlags(order: OrderActionInput): OrderActionFlags {
  const isCod = order.paymentMethod === "COD";
  const isOpen = isOpenOrder(order.status);
  const isFullyRefunded = order.refundedTotal >= order.totalAmount && order.refundedTotal > 0;

  // Something has to actually exist in a box before "đã gửi" means anything.
  // A cancelled order is never shippable; a fully refunded one has nothing
  // left worth sending.
  const shippable =
    order.hasPhysicalItems &&
    order.status !== "CANCELLED" &&
    !isFullyRefunded &&
    (order.status === "PAID" || order.status === "AWAITING_COD");

  const canShip = shippable && !order.shippedAt;
  const canDeliver = shippable && !!order.shippedAt && !order.deliveredAt;
  const canRevive = isAutoCancelledOrder(order.status, order.cancelReason);
  // Only money that came in can go back out. A COD order still awaiting
  // collection has taken nothing yet.
  const canRefund = order.status === "PAID" && !isFullyRefunded;
  const canCancel = isOpen;

  // The order below IS the timeline. A bank-transfer order is paid before it
  // ships; a COD order ships first and is paid last, which is why
  // "confirm-cod" sits after delivery rather than at the top.
  const primary: OrderPrimaryAction = canRevive
    ? "revive"
    : order.status === "PENDING"
      ? "confirm-bank"
      : canShip
        ? "ship"
        : canDeliver
          ? "deliver"
          : order.status === "AWAITING_COD"
            ? "confirm-cod"
            : null;

  return {
    isCod,
    isOpen,
    canShip,
    canDeliver,
    canRevive,
    canRefund,
    canCancel,
    isFullyRefunded,
    primary,
  };
}

export const ORDER_PRIMARY_ACTION_LABELS: Record<Exclude<OrderPrimaryAction, null>, string> = {
  "confirm-bank": "Xác nhận đã nhận tiền",
  "confirm-cod": "Đã thu đủ tiền",
  ship: "Đã gửi hàng",
  deliver: "Đã giao",
  revive: "Đã nhận được tiền",
};

/**
 * What the buyer sees as the state of their parcel. Kept beside the admin
 * rules so the two readings of the same columns can't drift.
 */
export type DeliveryStage = "packing" | "shipped" | "delivered" | null;

export function deliveryStage(order: {
  hasPhysicalItems: boolean;
  status: OrderStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}): DeliveryStage {
  if (!order.hasPhysicalItems || order.status === "CANCELLED") return null;
  if (order.deliveredAt) return "delivered";
  if (order.shippedAt) return "shipped";
  // A bank-transfer order isn't being packed until it's actually paid; a COD
  // one is packed straight away, since payment comes at the door.
  if (order.status === "PAID" || order.status === "AWAITING_COD") return "packing";
  return null;
}
