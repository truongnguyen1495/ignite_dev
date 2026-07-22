"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Students can only back out of an order before an admin has acted on it —
// once PAID, access has already been granted and cancelling here wouldn't
// walk that back (see cancelOrderAction in admin/orders/actions.ts).
export async function cancelMyOrderAction(orderId: string) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard/orders");
  await prisma.order.updateMany({
    where: { id: orderId, studentId: student.id, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}
