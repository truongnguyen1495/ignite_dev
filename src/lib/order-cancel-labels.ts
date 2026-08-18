import type { OrderCancelReason, OrderStatus } from "@prisma/client";

// Deliberately NOT "server-only": the same three facts below are needed by
// the admin's cancel dialog (a Client Component), the buyer's own order page
// (a Server Component) and the revive button's enabled/disabled rule. One
// definition, so the wording a buyer reads can't disagree with the reason an
// admin picked.

export const ORDER_CANCEL_REASON_LABELS: Record<OrderCancelReason, string> = {
  CUSTOMER_CHANGED_MIND: "Khách đổi ý",
  OUT_OF_STOCK: "Hết hàng",
  UNREACHABLE_CUSTOMER: "Không liên lạc được khách",
  DUPLICATE_ORDER: "Đơn bị trùng",
  OTHER: "Lý do khác",
  SYSTEM_EXPIRED: "Quá hạn thanh toán",
};

/**
 * What the buyer is told, which is not always what the admin picked.
 * "Không liên lạc được khách" is a note to staff; the buyer gets the plain
 * fact instead. SYSTEM_EXPIRED is phrased as something that happened rather
 * than something they did wrong — late money is recoverable (see the revive
 * path) and the copy must not make anyone think it isn't.
 */
export const ORDER_CANCEL_REASON_BUYER_LABELS: Record<OrderCancelReason, string> = {
  CUSTOMER_CHANGED_MIND: "Đơn đã được hủy theo yêu cầu của bạn",
  OUT_OF_STOCK: "Sản phẩm đã hết hàng",
  UNREACHABLE_CUSTOMER: "Chúng tôi chưa liên hệ được với bạn",
  DUPLICATE_ORDER: "Đơn này bị trùng với một đơn khác",
  OTHER: "Đơn đã được hủy",
  SYSTEM_EXPIRED: "Đơn đã tự hủy vì quá hạn thanh toán",
};

/**
 * The reasons an admin may choose. SYSTEM_EXPIRED is missing on purpose —
 * it's the mark of an automatic cancellation and the ONLY state a revive is
 * allowed from, so letting a human write it by hand would hand them a way to
 * un-cancel their own deliberate decision.
 */
export const ADMIN_ORDER_CANCEL_REASONS: OrderCancelReason[] = [
  "CUSTOMER_CHANGED_MIND",
  "OUT_OF_STOCK",
  "UNREACHABLE_CUSTOMER",
  "DUPLICATE_ORDER",
  "OTHER",
];

export function isAdminCancelReason(value: string): value is OrderCancelReason {
  return (ADMIN_ORDER_CANCEL_REASONS as string[]).includes(value);
}

/**
 * Did the system cancel this order, rather than a person?
 *
 * Checks the reason rather than `cancelledById === null`, which would be
 * wrong: every order cancelled before that column existed is also null and
 * would be misread as auto-cancelled — and therefore revivable.
 */
export function isAutoCancelledOrder(
  status: OrderStatus,
  cancelReason: OrderCancelReason | null
): boolean {
  return status === "CANCELLED" && cancelReason === "SYSTEM_EXPIRED";
}
