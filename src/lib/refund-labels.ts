import type { RefundReason } from "@prisma/client";

// Client-safe, same reasoning as order-cancel-labels.ts: the admin's refund
// dialog needs these, and so does the buyer's order page.

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  RETURNED_GOODS: "Khách trả lại hàng",
  DAMAGED_ON_ARRIVAL: "Hàng hỏng khi đến nơi",
  WRONG_ITEM: "Giao nhầm hàng",
  CUSTOMER_REQUEST: "Khách yêu cầu hoàn",
  OTHER: "Lý do khác",
};

export const REFUND_REASONS: RefundReason[] = [
  "RETURNED_GOODS",
  "DAMAGED_ON_ARRIVAL",
  "WRONG_ITEM",
  "CUSTOMER_REQUEST",
  "OTHER",
];

export function isRefundReason(value: string): value is RefundReason {
  return (REFUND_REASONS as string[]).includes(value);
}

/** Sum of refunds that still count — a voided row is not money that moved. */
export function activeRefundTotal(refunds: { amount: number; deletedAt: Date | null }[]): number {
  return refunds.filter((r) => r.deletedAt === null).reduce((sum, r) => sum + r.amount, 0);
}

export function isOrderFullyRefunded(totalAmount: number, refundedTotal: number): boolean {
  return refundedTotal > 0 && refundedTotal >= totalAmount;
}
