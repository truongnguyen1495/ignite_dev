"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission, requireActiveSuperAdmin, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { fulfillOrder } from "@/lib/order-fulfillment";

export async function confirmOrderPaidAction(orderId: string) {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  // Per the explicit rule documented on isSalesEnabled in src/lib/access.ts:
  // a pending order can't be confirmed while sales are toggled off, even by
  // an admin — the page already gates this, but a direct action call must
  // enforce it too, not just hide the button.
  await requireSalesEnabled("/admin/orders");
  await fulfillOrder(orderId, admin.id);
  revalidatePath("/admin/orders");
}

// Only meaningful from PENDING — a PAID order already granted access, and
// undoing that isn't part of v1 (see revokeOrderItemAccessAction below if an
// admin needs to walk back a mistake instead).
export async function cancelOrderAction(orderId: string) {
  await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/admin/orders");
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
