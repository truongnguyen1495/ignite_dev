import type { OrderStatus } from "@prisma/client";
import type { BadgeColor } from "@/components/ui/badge";

// "DH" + orderNumber, zero-padded — short enough to type into a bank
// transfer's nội dung field, and the string SePay's webhook will later
// scan incoming transfer content for to find the matching Order.
export function formatOrderCode(orderNumber: number): string {
  return `DH${String(orderNumber).padStart(6, "0")}`;
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
