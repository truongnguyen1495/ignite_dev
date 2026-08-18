"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission, requireActiveSuperAdmin, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { isAdminCancelReason } from "@/lib/order-cancel-labels";
import { isRefundReason } from "@/lib/refund-labels";
import { deleteOrderProof } from "@/lib/order-proof-storage";

export async function confirmOrderPaidAction(
  orderId: string,
  paymentProofPath?: string
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  // Per the explicit rule documented on isSalesEnabled in src/lib/access.ts:
  // a pending order can't be confirmed while sales are toggled off, even by
  // an admin — the page already gates this, but a direct action call must
  // enforce it too, not just hide the button.
  await requireSalesEnabled("/admin/orders");

  // Attached BEFORE fulfilment, in the same guarded write, so the proof can
  // never end up on an order that some other request already paid or
  // cancelled a moment earlier. The count tells us whether this caller is
  // the one that actually claimed the order.
  if (paymentProofPath) {
    const { count } = await prisma.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "AWAITING_COD"] }, deletedAt: null },
      data: { paymentProofPath },
    });
    if (count === 0) {
      // Nothing was claimed, so the uploaded bytes belong to no order —
      // remove them rather than leaving a private-bucket orphan behind.
      await deleteOrderProof(paymentProofPath);
      return { error: "Đơn này đã được xử lý bởi một thao tác khác." };
    }
  }

  await fulfillOrder(orderId, admin.id);
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {};
}

// Only meaningful from PENDING — a PAID order already granted access, and
// undoing that isn't part of v1 (see revokeOrderItemAccessAction below if an
// admin needs to walk back a mistake instead).
//
// The reason is required rather than optional: "Đã hủy" with no explanation
// is what this used to leave behind, and it told neither the buyer nor the
// next admin anything. A bad `reason` is rejected rather than silently
// stored — isAdminCancelReason also refuses SYSTEM_EXPIRED, which would
// otherwise let an admin hand themselves a revive path out of their own
// deliberate cancellation.
export async function cancelOrderAction(
  orderId: string,
  reason: string,
  note?: string
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");
  if (!isAdminCancelReason(reason)) {
    return { error: "Vui lòng chọn lý do hủy đơn." };
  }
  const trimmedNote = note?.trim();
  await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "AWAITING_COD"] }, deletedAt: null },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
      cancelNote: trimmedNote ? trimmedNote : null,
      cancelledById: admin.id,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {};
}

// "Đã nhận được tiền" — the way back for a transfer that arrived after the
// deadline. Without it, adding an expiry would have created a brand-new way
// to lose a customer's money: they pay at minute 31, the money is in the
// bank, and the order is dead with no path forward.
//
// The `cancelReason: SYSTEM_EXPIRED` condition is the whole safety model and
// is enforced in the updateMany itself, not just by hiding the button: an
// order a human cancelled on purpose can never be revived this way, however
// the action is called. fulfillOrder is deliberately NOT reused — it only
// moves PENDING -> PAID, and re-opening from CANCELLED needs its own atomic
// guard — so the grant work is done by handing the order back through the
// same fulfilment path afterwards.
export async function reviveOrderAction(
  orderId: string,
  paymentProofPath?: string
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");

  const now = new Date();
  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "CANCELLED",
      cancelReason: "SYSTEM_EXPIRED",
      deletedAt: null,
    },
    // Back to PENDING first, not straight to PAID: that hands the order to
    // fulfillOrder in exactly the state it expects, so access grants, the
    // paidAt stamp and the confirmedBy record all come from the one code
    // path that has always created them. revivedAt is what the buyer's page
    // reads to explain why a cancelled order is alive again.
    data: {
      status: "PENDING",
      cancelledAt: null,
      cancelReason: null,
      revivedAt: now,
      ...(paymentProofPath ? { paymentProofPath } : {}),
    },
  });
  if (count === 0) {
    if (paymentProofPath) await deleteOrderProof(paymentProofPath);
    return { error: "Đơn này không phải đơn hệ thống tự hủy nên không mở lại được." };
  }

  await fulfillOrder(orderId, admin.id);
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {};
}

// Lets an admin walk back a specific order item's access grant right from
// the orders list, instead of having to hunt down the same row on the
// course/library detail page. Deletes by orderItemId (deleteMany so it's a
// no-op, not an error, if already revoked from the other page) — never
// touches the Order itself, which intentionally stays "PAID" forever (see
// fulfillOrder in src/lib/order-fulfillment.ts).
export async function revokeOrderItemAccessAction(orderItemId: string) {
  await requireAdminPermission("MANAGE_ORDERS");
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item || item.kind === "PRODUCT") return;

  if (item.kind === "COURSE") {
    await prisma.courseAccessGrant.deleteMany({ where: { orderItemId } });
  } else {
    await prisma.libraryAccessGrant.deleteMany({ where: { orderItemId } });
  }
  revalidatePath("/admin/orders");
  if (item.courseId) revalidatePath(`/admin/courses/${item.courseId}`);
  if (item.libraryItemId) revalidatePath(`/admin/library/${item.libraryItemId}`);
}

// Undo for revokeOrderItemAccessAction — re-creates the exact grant row
// fulfillOrder would have created (same upsert, same grantedById: null
// convention marking it order-granted rather than an ad-hoc admin grant).
// Upsert on studentId_courseId/studentId_libraryItemId (not orderItemId)
// so this also correctly re-attaches an existing grant that another path
// created in the meantime, rather than erroring on a duplicate.
export async function restoreOrderItemAccessAction(orderItemId: string) {
  await requireAdminPermission("MANAGE_ORDERS");
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId }, include: { order: true } });
  if (!item || item.kind === "PRODUCT" || item.order.status !== "PAID") return;

  if (item.kind === "COURSE" && item.courseId) {
    await prisma.courseAccessGrant.upsert({
      where: { studentId_courseId: { studentId: item.order.studentId, courseId: item.courseId } },
      create: { studentId: item.order.studentId, courseId: item.courseId, grantedById: null, orderItemId: item.id },
      update: { orderItemId: item.id },
    });
  } else if (item.kind === "LIBRARY_ITEM" && item.libraryItemId) {
    await prisma.libraryAccessGrant.upsert({
      where: { studentId_libraryItemId: { studentId: item.order.studentId, libraryItemId: item.libraryItemId } },
      create: {
        studentId: item.order.studentId,
        libraryItemId: item.libraryItemId,
        grantedById: null,
        orderItemId: item.id,
      },
      update: { orderItemId: item.id },
    });
  }
  revalidatePath("/admin/orders");
  if (item.courseId) revalidatePath(`/admin/courses/${item.courseId}`);
  if (item.libraryItemId) revalidatePath(`/admin/library/${item.libraryItemId}`);
}

// Super-Admin-only by explicit request — narrower than requireAdminPermission
// on purpose, unlike every other action in this file. Soft-delete only: sets
// deletedAt so the row disappears from /admin/orders immediately, but the
// actual row (and its OrderItems) isn't purged until
// ORDER_TRASH_RETENTION_DAYS have passed (see purgeExpiredDeletedOrders,
// called opportunistically from the orders page loader). Whenever the purge
// eventually happens, it does NOT revoke access already granted:
// CourseAccessGrant/LibraryAccessGrant.orderItemId is ON DELETE SET NULL (see
// the add_grant_order_item_link migration), so deleting the OrderItem just
// orphans the grant row from any order record — the student keeps studying,
// only the transaction history/revenue figure disappears. Use
// revokeOrderItemAccessAction first if the intent is to also pull access.
export async function deleteOrderAction(orderId: string) {
  await requireActiveSuperAdmin();
  await prisma.order.update({ where: { id: orderId }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/orders");
}

// Undo for deleteOrderAction, only meaningful within the
// ORDER_TRASH_RETENTION_DAYS window (updateMany so a restore racing the
// opportunistic purge just no-ops instead of erroring if it already lost).
export async function restoreOrderAction(orderId: string) {
  await requireActiveSuperAdmin();
  await prisma.order.updateMany({ where: { id: orderId, deletedAt: { not: null } }, data: { deletedAt: null } });
  revalidatePath("/admin/orders");
}

// --- Giao hàng --------------------------------------------------------------

/**
 * Mark a parcel as sent, with who it went through and the code to track it.
 *
 * Guarded on the order still being open-or-paid and NOT already shipped, so
 * a double submit can't overwrite the first carrier/tracking pair with a
 * second one. Both fields are optional — a hand-delivered order has neither,
 * and refusing to record the shipment because of that would push admins back
 * to remembering it in their head.
 */
export async function markOrderShippedAction(
  orderId: string,
  carrier?: string,
  trackingCode?: string
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");

  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: { in: ["PAID", "AWAITING_COD"] },
      shippedAt: null,
      deletedAt: null,
      // There has to be something in a box. getOrderActionFlags already
      // hides the button for a course-only order, but that is a display
      // rule and this is a public POST.
      items: { some: { kind: "PRODUCT" } },
    },
    data: {
      shippedAt: new Date(),
      shippedById: admin.id,
      carrier: carrier?.trim() || null,
      trackingCode: trackingCode?.trim() || null,
    },
  });
  if (count === 0) {
    return { error: "Đơn này chưa thanh toán, không có hàng để gửi, đã gửi rồi, hoặc đã bị hủy." };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {};
}

/**
 * Mark a parcel as delivered. Requires it to have been shipped first —
 * "đã giao" without "đã gửi" would leave the buyer's timeline showing an
 * arrival that never departed.
 *
 * Does NOT touch payment: a COD order stays AWAITING_COD until the cash is
 * actually back, which is a separate confirmation (confirmOrderPaidAction).
 */
export async function markOrderDeliveredAction(
  orderId: string,
  note?: string
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");

  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      shippedAt: { not: null },
      deliveredAt: null,
      status: { in: ["PAID", "AWAITING_COD"] },
      deletedAt: null,
    },
    data: { deliveredAt: new Date(), deliveredById: admin.id, deliveryNote: note?.trim() || null },
  });
  if (count === 0) {
    return { error: "Đơn này chưa gửi hàng hoặc đã được đánh dấu đã giao." };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return {};
}

// --- Hoàn tiền --------------------------------------------------------------

/**
 * Record money given back. Written as its own row (see the Refund model) so
 * partial and repeated refunds both work, and so the amount carries the date
 * the money actually left rather than the date it was typed.
 *
 * The order stays PAID either way: it WAS paid, and rewriting that would
 * lose the fact. What changes is that the ledger now also says some of it
 * came back.
 */
export async function recordRefundAction(input: {
  orderId: string;
  amount: number;
  reason: string;
  note?: string;
  refundedAt?: string;
}): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");

  if (!isRefundReason(input.reason)) {
    return { error: "Vui lòng chọn lý do hoàn tiền." };
  }
  const amount = Math.trunc(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Số tiền hoàn phải lớn hơn 0." };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, totalAmount: true, deletedAt: true, refunds: { where: { deletedAt: null }, select: { amount: true } } },
  });
  if (!order || order.deletedAt || order.status !== "PAID") {
    return { error: "Chỉ hoàn tiền được cho đơn đã thanh toán." };
  }
  // Checked against what has already gone back, not just the order total:
  // three partial refunds must not be able to add up past what was taken.
  const already = order.refunds.reduce((sum, r) => sum + r.amount, 0);
  if (already + amount > order.totalAmount) {
    return { error: `Tổng hoàn tiền vượt quá số đã thu (còn tối đa ${order.totalAmount - already}đ).` };
  }

  // A date typed by hand is validated the same way the level-up form learned
  // to: JS rolls "2026-02-31" forward to March instead of rejecting it.
  let refundedAt = new Date();
  if (input.refundedAt) {
    const [year, month, day] = input.refundedAt.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return { error: "Ngày hoàn tiền không hợp lệ." };
    }
    refundedAt = parsed;
  }

  await prisma.refund.create({
    data: {
      orderId: input.orderId,
      amount,
      reason: input.reason,
      note: input.note?.trim() || null,
      refundedAt,
      createdById: admin.id,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/dashboard/orders/${input.orderId}`);
  return {};
}

/** Void a refund row that was entered wrongly — never edits the figure. */
export async function voidRefundAction(refundId: string): Promise<void> {
  await requireAdminPermission("MANAGE_ORDERS");
  const refund = await prisma.refund.findUnique({ where: { id: refundId }, select: { orderId: true } });
  await prisma.refund.updateMany({ where: { id: refundId, deletedAt: null }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/orders");
  if (refund) revalidatePath(`/dashboard/orders/${refund.orderId}`);
}
