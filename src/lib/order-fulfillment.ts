import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), confirmedById },
  });
  if (count === 0) return;

  if (order.items.length > 0) {
    await prisma.$transaction(
      order.items.map((item) =>
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
      )
    );
  }

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
