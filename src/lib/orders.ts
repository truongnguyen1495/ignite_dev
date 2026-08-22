import type { OrderItemKind, OrderStatus, PaymentMethod } from "@prisma/client";
import type { BadgeColor } from "@/components/ui/badge";

// "DH" + orderNumber, zero-padded — short enough to type into a bank
// transfer's nội dung field, and the string SePay's webhook will later
// scan incoming transfer content for to find the matching Order.
export function formatOrderCode(orderNumber: number): string {
  return `DH${String(orderNumber).padStart(6, "0")}`;
}

// Reverse of formatOrderCode — scans a bank transfer's free-text "nội dung"
// for the first "DH<digits>" substring (customers often type extra bank-app
// boilerplate around it) and returns the parsed orderNumber, or null if none
// found. Used by the SePay webhook (src/app/api/webhooks/sepay/route.ts) to
// match an incoming transaction back to an Order. Deliberately tolerant of
// leading zeros / no zero-padding, since a customer's banking app may not
// preserve them — parseInt("000123", 10) === 123 either way, and
// Order.orderNumber is compared as a plain Int.
export function parseOrderNumberFromContent(content: string): number | null {
  const match = content.match(/DH(\d+)/i);
  if (!match) return null;
  const orderNumber = parseInt(match[1], 10);
  return Number.isFinite(orderNumber) ? orderNumber : null;
}

// How long a new order waits for its bank transfer before cancelling
// itself. Deliberately longer than the 10 minutes both sibling projects
// use: they sell coffee and single courses, while an order here can run
// into seven figures and the buyer may need to reach a banking app they
// don't have installed, or a branch.
//
// Lives in this client-safe module because the countdown the buyer watches
// and the sweep that enforces the deadline both read it — one number, so
// what a buyer is promised and what the server does cannot drift apart.
export const ORDER_PENDING_EXPIRY_MINUTES = 30;

// The deadline stamped onto an order when it's created (Order.paymentDeadline
// — see that field's comment for why it's stored rather than recomputed).
export function paymentDeadlineFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ORDER_PENDING_EXPIRY_MINUTES * 60 * 1000);
}

// Ceiling for one cart line. Without it, a stepper held down (or a direct
// action call) can put an arbitrary number on a real order.
export const MAX_CART_QUANTITY = 99;

// Clamps whatever arrived to a sane line quantity. Server-side guard, not a
// UI nicety: the quantity actions are ordinary POSTs and cannot trust that
// the buyer used the buttons.
export function sanitizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.trunc(value)));
}

// What a line actually costs. priceAtPurchase is the UNIT price (see its
// comment in schema.prisma), so every total in the app has to come through
// here rather than summing the raw column — the two were interchangeable
// only while every line held exactly one item.
export function orderItemTotal(item: { priceAtPurchase: number; quantity: number }): number {
  return item.priceAtPurchase * item.quantity;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  AWAITING_COD: "Chờ thu tiền khi giao",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export const ORDER_STATUS_BADGE_COLOR: Record<OrderStatus, BadgeColor> = {
  PENDING: "warning",
  AWAITING_COD: "info",
  PAID: "success",
  CANCELLED: "danger",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  COD: "Thanh toán khi nhận hàng",
};

export const ORDER_ITEM_KIND_LABELS: Record<OrderItemKind, string> = {
  COURSE: "Khóa học độc quyền",
  LIBRARY_ITEM: "Tài liệu thư viện",
  PRODUCT: "Sản phẩm vật lý",
};

/**
 * An order that still owes money, whichever way it's being paid. Both the
 * "chưa xong" filters and the actions an admin may still take key off this
 * rather than checking PENDING alone, which would silently skip every COD
 * order the moment that status existed.
 */
export function isOpenOrder(status: OrderStatus): boolean {
  return status === "PENDING" || status === "AWAITING_COD";
}

/**
 * Whether pay-on-delivery may be offered for a basket.
 *
 * Only when every single line is a physical product. A course or a book in
 * the same order leaves two bad options and no good one: unlock it up front
 * and the buyer can refuse the parcel while keeping it, or withhold it until
 * the parcel lands and someone who bought an online course is waiting days
 * for a courier. Enforced in confirmCartOrderAction, not just hidden in the
 * UI — the checkout form is an ordinary POST.
 */
export function canPayOnDelivery(items: { kind: OrderItemKind }[]): boolean {
  return items.length > 0 && items.every((item) => item.kind === "PRODUCT");
}

// How long a soft-deleted Order (Order.deletedAt set, see deleteOrderAction
// in admin/orders/actions.ts) lingers before purgeExpiredDeletedOrders
// actually removes the row — a grace window, not a real trash/restore UI
// (nothing reads deletedAt rows back yet).
export const ORDER_TRASH_RETENTION_DAYS = 30;
