"use server";

import { revalidatePath } from "next/cache";
import type { OrderItemKind } from "@prisma/client";
import { requireActiveStudent, isSalesEnabled, getCourseAccessLevel, studentHasLibraryItemAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/pricing";

export type CreateOrderResult = { error?: string; orderId?: string };

// Re-checks isSalesEnabled server-side (defense-in-depth — the buy button
// is already hidden when sales are off, but this stops a direct call too)
// and blocks anyone who already has access (bought before, or admin-granted
// for free) or already has a pending order for the same item — returns that
// existing order instead of creating a duplicate.
export async function createOrderAction(kind: OrderItemKind, itemId: string): Promise<CreateOrderResult> {
  const student = await requireActiveStudent();
  if (!(await isSalesEnabled())) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }

  if (kind === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: itemId } });
    const coursePricing = course && getPricing(course);
    if (!course || !coursePricing?.forSale) {
      return { error: "Khóa học này không bán." };
    }
    const accessLevel = await getCourseAccessLevel(student, itemId);
    if (accessLevel === "full") {
      return { error: "Bạn đã có quyền xem khóa học này." };
    }

    const existing = await prisma.orderItem.findFirst({
      where: { courseId: itemId, order: { studentId: student.id, status: "PENDING" } },
    });
    if (existing) return { orderId: existing.orderId };

    const order = await prisma.order.create({
      data: {
        studentId: student.id,
        totalAmount: coursePricing.chargeAmount,
        items: {
          create: {
            kind: "COURSE",
            courseId: itemId,
            titleSnapshot: course.title,
            priceAtPurchase: coursePricing.chargeAmount,
          },
        },
      },
    });
    revalidatePath("/dashboard/orders");
    return { orderId: order.id };
  }

  const item = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  const itemPricing = item && getPricing(item);
  if (!item || !itemPricing?.forSale) {
    return { error: "Tài liệu này không bán." };
  }
  if (await studentHasLibraryItemAccess(student, itemId)) {
    return { error: "Bạn đã có quyền xem tài liệu này." };
  }

  const existing = await prisma.orderItem.findFirst({
    where: { libraryItemId: itemId, order: { studentId: student.id, status: "PENDING" } },
  });
  if (existing) return { orderId: existing.orderId };

  const order = await prisma.order.create({
    data: {
      studentId: student.id,
      totalAmount: itemPricing.chargeAmount,
      items: {
        create: {
          kind: "LIBRARY_ITEM",
          libraryItemId: itemId,
          titleSnapshot: item.title,
          priceAtPurchase: itemPricing.chargeAmount,
        },
      },
    },
  });
  revalidatePath("/dashboard/orders");
  return { orderId: order.id };
}
