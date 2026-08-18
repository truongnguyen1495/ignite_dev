import "server-only";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The shape both sweeps need. `paymentDeadline` is null for every order
 * placed before that column existed — those were made under the old
 * "waits forever" promise and must never be swept (see the field's comment
 * in schema.prisma).
 */
type ExpirableOrder = {
  id: string;
  status: OrderStatus;
  paymentDeadline: Date | null;
};

/**
 * Cancel one overdue order, if it is overdue.
 *
 * There is no cron or queue in this app, so the deadline isn't enforced by a
 * scheduled job — this runs opportunistically instead, from every place that
 * reads a single PENDING order: the buyer's own order page on each load, and
 * the status endpoint their page polls, which picks it up within one tick
 * even if they simply leave the tab open past the deadline.
 *
 * The updateMany guard is what makes that safe: only a row still PENDING is
 * touched, so this can never race ahead of a payment confirmation that
 * landed a moment earlier and un-pay a real order. Returns whether it
 * actually cancelled, so the caller can render the new status in the same
 * pass instead of showing a stale one.
 *
 * Deliberately no revalidatePath() here, unlike the confirm/cancel actions:
 * this is also called from a page's own render, where revalidatePath throws.
 * Every caller re-queries on its next request anyway.
 */
export async function expirePendingOrderIfNeeded(order: ExpirableOrder): Promise<boolean> {
  if (order.status !== "PENDING" || !order.paymentDeadline) return false;
  if (Date.now() < order.paymentDeadline.getTime()) return false;

  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING", deletedAt: null },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      // cancelledById stays null — no human did this. SYSTEM_EXPIRED is the
      // actual mark, and the only state an admin may revive from.
      cancelReason: "SYSTEM_EXPIRED",
    },
  });
  return count > 0;
}

/**
 * Bulk sibling for a page listing many orders at once rather than reading
 * one: same opportunistic approach, a single statement covering every
 * overdue order instead of a round trip per row — which matters here, where
 * DATABASE_URL runs with connection_limit=1.
 *
 * `studentId` scopes the sweep to one buyer, which is how their own order
 * list calls it: a buyer loading their page has no business cancelling
 * anyone else's orders, and without the sweep their list would still say
 * "Chờ thanh toán" for an order that says "Đã hủy" the moment they open it.
 * /admin/orders passes nothing and sweeps everything.
 *
 * `paymentDeadline: { not: null }` is redundant next to `lt: now` (SQL drops
 * NULL comparisons anyway) but is written out so the grandfathering rule is
 * visible at the callsite rather than resting on three-valued logic.
 */
export async function expireOverduePendingOrders(studentId?: string): Promise<void> {
  await prisma.order.updateMany({
    where: {
      status: "PENDING",
      deletedAt: null,
      paymentDeadline: { not: null, lt: new Date() },
      ...(studentId ? { studentId } : {}),
    },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "SYSTEM_EXPIRED" },
  });
}
