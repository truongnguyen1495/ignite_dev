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
  if (!order || order.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), confirmedById },
    }),
    ...order.items.map((item) =>
      item.kind === "COURSE"
        ? prisma.courseAccessGrant.upsert({
            where: { studentId_courseId: { studentId: order.studentId, courseId: item.courseId! } },
            create: { studentId: order.studentId, courseId: item.courseId!, grantedById: null },
            update: {},
          })
        : prisma.libraryAccessGrant.upsert({
            where: {
              studentId_libraryItemId: { studentId: order.studentId, libraryItemId: item.libraryItemId! },
            },
            create: { studentId: order.studentId, libraryItemId: item.libraryItemId!, grantedById: null },
            update: {},
          })
    ),
  ]);

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
