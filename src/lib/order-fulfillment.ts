import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ORDER_TRASH_RETENTION_DAYS } from "@/lib/orders";
import { createCommissionsForOrder } from "@/lib/vendor-commission";

// Single choke point for "this order is now paid" — called today by the
// manual admin confirm action (src/app/admin/orders/actions.ts), and meant
// to be the same function a future SePay webhook calls once it matches an
// incoming bank transfer to an Order by orderNumber. Granting access is
// just the same upsert the admin "cấp quyền" buttons already do
// (grantedById: null marks it as system/order-granted, not admin-granted) —
// src/lib/access.ts never needs to know Order exists.
export async function fulfillOrder(orderId: string, confirmedById: string | null): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  // Atomic guard against a confirm racing a cancel (or a duplicate confirm)
  // — only the caller that actually flips PENDING -> PAID goes on to grant
  // access, same "condition inside the write" pattern as cancelOrderAction/
  // cancelMyOrderAction. Deliberately split from the grant upserts below
  // (not one $transaction) instead of branching on this count inside an
  // interactive transaction, because Supabase's pooled connection can't hold
  // one open across round trips — see the array-form $transaction comment on
  // saveQuizAction in src/app/admin/quizzes/actions.ts.
  // Accepts either open status: a bank transfer arriving (PENDING) and cash
  // collected on delivery (AWAITING_COD) are the same event as far as this
  // function is concerned — money is in, grant what was bought. Listing both
  // explicitly rather than "not PAID, not CANCELLED" keeps the atomic guard
  // exact: a cancelled order must never be resurrected by a stray confirm.
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "AWAITING_COD"] } },
    data: { status: "PAID", paidAt: new Date(), confirmedById },
  });
  if (count === 0) return;

  // PRODUCT items get no access-grant row — a physical good has nothing
  // digital to unlock, unlike COURSE/LIBRARY_ITEM. Being PAID is itself the
  // fulfillment signal; shipping happens outside this system using the
  // Order.shipping* fields the student filled in at checkout.
  const grantOps = order.items
    .filter((item) => item.kind !== "PRODUCT")
    .map((item) =>
      item.kind === "COURSE"
        ? prisma.courseAccessGrant.upsert({
            where: { studentId_courseId: { studentId: order.studentId, courseId: item.courseId! } },
            create: { studentId: order.studentId, courseId: item.courseId!, grantedById: null, orderItemId: item.id },
            update: {},
          })
        : prisma.libraryAccessGrant.upsert({
            where: {
              studentId_libraryItemId: { studentId: order.studentId, libraryItemId: item.libraryItemId! },
            },
            create: {
              studentId: order.studentId,
              libraryItemId: item.libraryItemId!,
              grantedById: null,
              orderItemId: item.id,
            },
            update: {},
          })
    );
  if (grantOps.length > 0) {
    await prisma.$transaction(grantOps);
  }

  // Marketplace "Nhà bán hàng" — one Commission row per line that was bought
  // from a vendor. Deliberately after the access-grant upserts above (a
  // vendor's course/library line already behaves exactly like a platform
  // one for the buyer; this only adds bookkeeping for the seller's side).
  await createCommissionsForOrder(orderId);

  revalidatePath("/admin/orders");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/library");
  for (const item of order.items) {
    if (item.courseId) revalidatePath(`/admin/courses/${item.courseId}`);
    if (item.libraryItemId) revalidatePath(`/admin/library/${item.libraryItemId}`);
  }
}

// No cron/queue infra in this app, so the retention window isn't enforced by
// a scheduled job — this just gets called opportunistically from the
// /admin/orders page loader on every visit. A day or two of drift past
// exactly ORDER_TRASH_RETENTION_DAYS is harmless for a manual-review trash
// window like this one.
export async function purgeExpiredDeletedOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - ORDER_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.order.deleteMany({ where: { deletedAt: { lt: cutoff } } });
}
