import type { OrderStatus } from "@prisma/client";
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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export const ORDER_STATUS_BADGE_COLOR: Record<OrderStatus, BadgeColor> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

// How long a soft-deleted Order (Order.deletedAt set, see deleteOrderAction
// in admin/orders/actions.ts) lingers before purgeExpiredDeletedOrders
// actually removes the row — a grace window, not a real trash/restore UI
// (nothing reads deletedAt rows back yet).
export const ORDER_TRASH_RETENTION_DAYS = 30;
