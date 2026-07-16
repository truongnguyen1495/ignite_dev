"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission, requireSalesEnabled } from "@/lib/access";
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
// undoing that isn't part of v1 (see revoke-access buttons on the
// course/library detail pages if an admin needs to walk back a mistake).
export async function cancelOrderAction(orderId: string) {
  await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/orders");
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/admin/orders");
}
