"use server";

import { revalidatePath } from "next/cache";
import type { OrderItemKind } from "@prisma/client";
import {
  requireActiveStudent,
  isSalesEnabled,
  getCourseAccessLevel,
  studentHasLibraryItemAccess,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/pricing";

export type ShippingDetails = { name: string; phone: string; address: string };

// Re-checks isSalesEnabled server-side (defense-in-depth — the buy button is
// already hidden when sales are off) and blocks anyone who already has
// access (bought before, or admin-granted for free) or already has this item
// in the cart. Unlike the old createOrderAction this never creates an Order
// — it only ever adds a CartItem row (see the model comment in schema.prisma
// for why the cart is deliberately not "just a PENDING order").
export async function addToCartAction(kind: OrderItemKind, itemId: string): Promise<{ error?: string }> {
  const student = await requireActiveStudent();
  if (!(await isSalesEnabled())) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }

  if (kind === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: itemId } });
    if (!course || !getPricing(course).forSale) {
      return { error: "Khóa học này không bán." };
    }
    if ((await getCourseAccessLevel(student, itemId)) === "full") {
      return { error: "Bạn đã có quyền xem khóa học này." };
    }
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, courseId: itemId } });
    if (existing) return {};
    await prisma.cartItem.create({ data: { studentId: student.id, kind: "COURSE", courseId: itemId } });
  } else if (kind === "LIBRARY_ITEM") {
    const item = await prisma.libraryItem.findUnique({ where: { id: itemId } });
    if (!item || !getPricing(item).forSale) {
      return { error: "Tài liệu này không bán." };
    }
    if (await studentHasLibraryItemAccess(student, itemId)) {
      return { error: "Bạn đã có quyền xem tài liệu này." };
    }
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, libraryItemId: itemId } });
    if (existing) return {};
    await prisma.cartItem.create({ data: { studentId: student.id, kind: "LIBRARY_ITEM", libraryItemId: itemId } });
  } else {
    const product = await prisma.product.findUnique({ where: { id: itemId } });
    if (!product || !getPricing(product).forSale) {
      return { error: "Sản phẩm này không bán." };
    }
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, productId: itemId } });
    if (existing) return {};
    await prisma.cartItem.create({ data: { studentId: student.id, kind: "PRODUCT", productId: itemId } });
  }

  revalidatePath("/dashboard/cart");
  return {};
}

export async function removeFromCartAction(cartItemId: string): Promise<void> {
  const student = await requireActiveStudent();
  await prisma.cartItem.deleteMany({ where: { id: cartItemId, studentId: student.id } });
  revalidatePath("/dashboard/cart");
}

export type ConfirmCartResult = { error?: string; orderId?: string };

// Turns the student's cart into one real (possibly multi-item) Order, then
// clears every cart row it consumed — the only place an Order is ever
// created from here on (see the CartItem model comment). Re-validates every
// line against live data instead of trusting what was true when it was
// added: an item bought/granted elsewhere in the meantime, taken off sale,
// or deleted is silently dropped from the cart rather than blocking checkout
// for the rest — matches the "don't error on state that resolved itself"
// spirit of the duplicate-order guard the old createOrderAction used.
export async function confirmCartOrderAction(shipping?: ShippingDetails): Promise<ConfirmCartResult> {
  const student = await requireActiveStudent();
  if (!(await isSalesEnabled())) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { studentId: student.id },
    include: { course: true, libraryItem: true, product: true },
  });
  if (cartItems.length === 0) {
    return { error: "Giỏ hàng trống." };
  }

  const staleIds: string[] = [];
  const orderItems: { kind: OrderItemKind; courseId?: string; libraryItemId?: string; productId?: string; titleSnapshot: string; priceAtPurchase: number }[] = [];

  for (const item of cartItems) {
    if (item.kind === "COURSE") {
      const pricing = item.course && getPricing(item.course);
      const stillOwned = item.course && (await getCourseAccessLevel(student, item.course.id)) === "full";
      if (!item.course || !pricing?.forSale || stillOwned) {
        staleIds.push(item.id);
        continue;
      }
      orderItems.push({
        kind: "COURSE",
        courseId: item.course.id,
        titleSnapshot: item.course.title,
        priceAtPurchase: pricing.chargeAmount,
      });
    } else if (item.kind === "LIBRARY_ITEM") {
      const pricing = item.libraryItem && getPricing(item.libraryItem);
      const stillOwned = item.libraryItem && (await studentHasLibraryItemAccess(student, item.libraryItem.id));
      if (!item.libraryItem || !pricing?.forSale || stillOwned) {
        staleIds.push(item.id);
        continue;
      }
      orderItems.push({
        kind: "LIBRARY_ITEM",
        libraryItemId: item.libraryItem.id,
        titleSnapshot: item.libraryItem.title,
        priceAtPurchase: pricing.chargeAmount,
      });
    } else {
      const pricing = item.product && getPricing(item.product);
      if (!item.product || !pricing?.forSale) {
        staleIds.push(item.id);
        continue;
      }
      orderItems.push({
        kind: "PRODUCT",
        productId: item.product.id,
        titleSnapshot: item.product.title,
        priceAtPurchase: pricing.chargeAmount,
      });
    }
  }

  if (staleIds.length > 0) {
    await prisma.cartItem.deleteMany({ where: { id: { in: staleIds } } });
    revalidatePath("/dashboard/cart");
  }
  if (orderItems.length === 0) {
    return { error: "Giỏ hàng của bạn không còn sản phẩm hợp lệ, đã được dọn." };
  }

  const hasProduct = orderItems.some((i) => i.kind === "PRODUCT");
  const name = shipping?.name.trim();
  const phone = shipping?.phone.trim();
  const address = shipping?.address.trim();
  if (hasProduct && (!name || !phone || !address)) {
    return { error: "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng." };
  }

  const totalAmount = orderItems.reduce((sum, i) => sum + i.priceAtPurchase, 0);
  const consumedIds = cartItems.filter((c) => !staleIds.includes(c.id)).map((c) => c.id);

  const order = await prisma.order.create({
    data: {
      studentId: student.id,
      totalAmount,
      ...(hasProduct ? { shippingName: name, shippingPhone: phone, shippingAddress: address } : {}),
      items: { create: orderItems },
    },
  });
  await prisma.cartItem.deleteMany({ where: { id: { in: consumedIds } } });

  revalidatePath("/dashboard/cart");
  revalidatePath("/dashboard/orders");
  return { orderId: order.id };
}
