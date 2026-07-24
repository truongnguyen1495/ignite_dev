"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { addToCartAction } from "@/app/dashboard/cart/actions";

// Students can only back out of an order before an admin has acted on it —
// once PAID, access has already been granted and cancelling here wouldn't
// walk that back (see cancelOrderAction in admin/orders/actions.ts).
export async function cancelMyOrderAction(orderId: string) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard/orders");
  await prisma.order.updateMany({
    where: { id: orderId, studentId: student.id, status: "PENDING", deletedAt: null },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export type ReorderResult = {
  addedCount: number;
  skipped: { title: string; reason: string }[];
};

// "Đặt lại" for a CANCELLED order — re-adds each item to the cart at
// TODAY'S price (never the old priceAtPurchase snapshot: reorder means
// re-attempting the purchase, not honoring a stale quote). Only offered for
// CANCELLED orders — nothing was ever fulfilled, so there's no "already
// delivered" ambiguity a PAID reorder would have (a course/library grant is
// permanent, so re-adding one already owned makes no sense there).
//
// Deliberately reuses addToCartAction per item instead of re-implementing
// its checks (still for sale, not already owned, not already in cart) —
// keeps this path guaranteed identical to a normal "Mua ngay" add, and a
// future rule change there (e.g. a new ownership check) doesn't need to be
// duplicated here. The minor cost is requireActiveStudent() re-running
// once per item; irrelevant at the scale of one order's item list.
//
// Never fails the whole action for one bad item (per user decision) — a
// course taken off sale or already owned, or a hard-deleted item (courseId/
// libraryItemId/productId gone via the FK's SetNull default) just gets
// skipped with a reason, while everything still reorderable is added.
export async function reorderAction(orderId: string): Promise<ReorderResult> {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard/orders");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.studentId !== student.id || order.status !== "CANCELLED" || order.deletedAt) {
    return { addedCount: 0, skipped: [] };
  }

  let addedCount = 0;
  const skipped: { title: string; reason: string }[] = [];

  for (const item of order.items) {
    const itemId = item.courseId ?? item.libraryItemId ?? item.productId;
    if (!itemId) {
      skipped.push({ title: item.titleSnapshot, reason: "Sản phẩm/khóa học này đã bị xóa khỏi hệ thống." });
      continue;
    }
    const result = await addToCartAction(item.kind, itemId);
    if (result.error) {
      skipped.push({ title: item.titleSnapshot, reason: result.error });
    } else {
      addedCount++;
    }
  }

  return { addedCount, skipped };
}
