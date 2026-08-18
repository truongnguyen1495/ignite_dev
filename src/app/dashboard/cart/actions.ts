"use server";

import { revalidatePath } from "next/cache";
import type { OrderItemKind } from "@prisma/client";
import {
  requireActiveStudent,
  getActiveStudentOrNull,
  isSalesEnabled,
  getCourseAccessLevel,
  studentHasLibraryItemAccess,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/pricing";
import { paymentDeadlineFrom, sanitizeQuantity, orderItemTotal, canPayOnDelivery } from "@/lib/orders";
import type { PaymentMethod } from "@prisma/client";

export type ShippingDetails = { name: string; phone: string; address: string };

// Re-checks isSalesEnabled server-side (defense-in-depth — the buy button is
// already hidden when sales are off) and blocks anyone who already has
// access (bought before, or admin-granted for free) or already has this item
// in the cart. Unlike the old createOrderAction this never creates an Order
// — it only ever adds a CartItem row (see the model comment in schema.prisma
// for why the cart is deliberately not "just a PENDING order").
export async function addToCartAction(
  kind: OrderItemKind,
  itemId: string
): Promise<{ error?: string; needsLogin?: boolean; cartItemId?: string }> {
  // Deliberately the non-redirecting variant. requireActiveStudent() would
  // bounce a signed-out visitor straight to /login and lose what they were
  // trying to buy — the four public product landing pages exist precisely to
  // sell to people who don't have an account yet, so the caller is told to
  // send them to login WITH that context instead.
  const student = await getActiveStudentOrNull();
  if (!student) {
    return { needsLogin: true };
  }
  if (!(await isSalesEnabled())) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }

  let addedId: string | undefined;
  if (kind === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: itemId } });
    if (!course || !getPricing(course).forSale) {
      return { error: "Khóa học này không bán." };
    }
    if ((await getCourseAccessLevel(student, itemId)) === "full") {
      return { error: "Bạn đã có quyền xem khóa học này." };
    }
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, courseId: itemId } });
    // The id is returned so "Mua riêng món này" can check out this exact
    // line — see CheckoutInput.onlyCartItemId.
    if (existing) return { cartItemId: existing.id };
    const created = await prisma.cartItem.create({
      data: { studentId: student.id, kind: "COURSE", courseId: itemId },
      select: { id: true },
    });
    addedId = created.id;
  } else if (kind === "LIBRARY_ITEM") {
    const item = await prisma.libraryItem.findUnique({ where: { id: itemId } });
    if (!item || !getPricing(item).forSale) {
      return { error: "Tài liệu này không bán." };
    }
    if (await studentHasLibraryItemAccess(student, itemId)) {
      return { error: "Bạn đã có quyền xem tài liệu này." };
    }
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, libraryItemId: itemId } });
    if (existing) return { cartItemId: existing.id };
    const created = await prisma.cartItem.create({
      data: { studentId: student.id, kind: "LIBRARY_ITEM", libraryItemId: itemId },
      select: { id: true },
    });
    addedId = created.id;
  } else {
    const product = await prisma.product.findUnique({ where: { id: itemId } });
    if (!product || !getPricing(product).forSale) {
      return { error: "Sản phẩm này không bán." };
    }
    // Unlike a course or a book, adding the same product twice is a real
    // intent — it means "two of these" — so this increments instead of
    // quietly doing nothing, and stops at the cap rather than erroring.
    const existing = await prisma.cartItem.findFirst({ where: { studentId: student.id, productId: itemId } });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: sanitizeQuantity(existing.quantity + 1) },
      });
      addedId = existing.id;
    } else {
      const created = await prisma.cartItem.create({
        data: { studentId: student.id, kind: "PRODUCT", productId: itemId },
        select: { id: true },
      });
      addedId = created.id;
    }
  }

  revalidatePath("/dashboard/cart");
  return { cartItemId: addedId };
}

export async function removeFromCartAction(cartItemId: string): Promise<void> {
  const student = await requireActiveStudent();
  await prisma.cartItem.deleteMany({ where: { id: cartItemId, studentId: student.id } });
  revalidatePath("/dashboard/cart");
}

/**
 * Set a line's quantity from the cart's +/− stepper.
 *
 * Scoped to PRODUCT lines in the write itself, not just by hiding the
 * control: this is a plain POST, and a course whose quantity crept above 1
 * would bill a buyer twice for something they can only own once.
 */
export async function setCartQuantityAction(cartItemId: string, quantity: number): Promise<void> {
  const student = await requireActiveStudent();
  await prisma.cartItem.updateMany({
    where: { id: cartItemId, studentId: student.id, kind: "PRODUCT" },
    data: { quantity: sanitizeQuantity(quantity) },
  });
  revalidatePath("/dashboard/cart");
  revalidatePath("/dashboard/thanh-toan");
}

export type CheckoutInput = {
  paymentMethod: PaymentMethod;
  /** A saved address the buyer picked. Wins over `shipping` when both arrive. */
  addressId?: string;
  /** A freshly typed address, used when no saved one was chosen. */
  shipping?: ShippingDetails;
  /**
   * "Mua riêng món này" — check out exactly this cart line and leave the
   * rest of the basket alone. Without it, a buyer who pressed Mua ngay on
   * one product while three other things sat in their cart would be billed
   * for all four.
   */
  onlyCartItemId?: string;
  saveAddress?: boolean;
  addressLabel?: string;
};

export type ConfirmCartResult = { error?: string; orderId?: string };

/**
 * Turns whichever way the buyer supplied an address into the one shape the
 * order needs. A saved address is re-read from the database rather than
 * trusted from the form — the client sends only an id, so nothing about
 * where a parcel goes comes from user-supplied text in that path.
 */
async function resolveShipping(
  studentId: string,
  input: CheckoutInput
): Promise<ShippingDetails | undefined> {
  if (input.addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: input.addressId, studentId },
      select: { recipientName: true, recipientPhone: true, addressLine: true },
    });
    if (saved) {
      return { name: saved.recipientName, phone: saved.recipientPhone, address: saved.addressLine };
    }
    // Fall through to the typed address rather than failing: the saved one
    // may have been deleted in another tab while this page sat open.
  }
  return input.shipping;
}

/**
 * Adds an address to the buyer's book, making it the default when it is
 * their first. Skips an exact duplicate so repeated checkouts to the same
 * place don't grow the list.
 */
async function saveAddressForStudent(
  studentId: string,
  entry: { name: string; phone: string; address: string; label?: string }
): Promise<void> {
  const duplicate = await prisma.address.findFirst({
    where: {
      studentId,
      recipientName: entry.name,
      recipientPhone: entry.phone,
      addressLine: entry.address,
    },
    select: { id: true },
  });
  if (duplicate) return;

  const count = await prisma.address.count({ where: { studentId } });
  await prisma.address.create({
    data: {
      studentId,
      label: entry.label?.trim() || null,
      recipientName: entry.name,
      recipientPhone: entry.phone,
      addressLine: entry.address,
      isDefault: count === 0,
    },
  });
}

// Turns the student's cart into one real (possibly multi-item) Order, then
// clears every cart row it consumed — the only place an Order is ever
// created from here on (see the CartItem model comment). Re-validates every
// line against live data instead of trusting what was true when it was
// added: an item bought/granted elsewhere in the meantime, taken off sale,
// or deleted is silently dropped from the cart rather than blocking checkout
// for the rest — matches the "don't error on state that resolved itself"
// spirit of the duplicate-order guard the old createOrderAction used.
export async function confirmCartOrderAction(input: CheckoutInput): Promise<ConfirmCartResult> {
  const student = await requireActiveStudent();
  if (!(await isSalesEnabled())) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }
  const shipping = await resolveShipping(student.id, input);

  const cartItems = await prisma.cartItem.findMany({
    where: {
      studentId: student.id,
      ...(input.onlyCartItemId ? { id: input.onlyCartItemId } : {}),
    },
    include: { course: true, libraryItem: true, product: true },
  });
  if (cartItems.length === 0) {
    return { error: input.onlyCartItemId ? "Món này không còn trong giỏ hàng." : "Giỏ hàng trống." };
  }

  const staleIds: string[] = [];
  const orderItems: { kind: OrderItemKind; courseId?: string; libraryItemId?: string; productId?: string; titleSnapshot: string; priceAtPurchase: number; quantity: number }[] = [];

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
        // Always 1: a course is owned once, and the cart never offers a
        // stepper for one. Written out rather than left to the column
        // default so the intent is visible next to the PRODUCT line below.
        quantity: 1,
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
        quantity: 1,
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
        // Re-clamped rather than trusted: the row could have been written
        // before the cap existed, or by an older client.
        quantity: sanitizeQuantity(item.quantity),
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

  // Re-checked against what the cart ACTUALLY still contains, not against
  // what the page rendered: an item could have gone stale between the two,
  // and this form is a plain POST either way.
  const payOnDelivery = input.paymentMethod === "COD";
  if (payOnDelivery && !canPayOnDelivery(orderItems)) {
    return { error: "Đơn có khóa học hoặc sách số nên không dùng được hình thức trả khi nhận hàng." };
  }

  const totalAmount = orderItems.reduce((sum, i) => sum + orderItemTotal(i), 0);
  const consumedIds = cartItems.filter((c) => !staleIds.includes(c.id)).map((c) => c.id);

  const order = await prisma.order.create({
    data: {
      studentId: student.id,
      totalAmount,
      paymentMethod: input.paymentMethod,
      // AWAITING_COD carries no deadline: there is no transfer on its way,
      // so there is nothing to time out — expiring it would throw away an
      // order the courier is about to deliver. Only the transfer path gets
      // a stamped deadline (see Order.paymentDeadline in schema.prisma).
      ...(payOnDelivery
        ? { status: "AWAITING_COD" as const }
        : { paymentDeadline: paymentDeadlineFrom(new Date()) }),
      ...(hasProduct ? { shippingName: name, shippingPhone: phone, shippingAddress: address } : {}),
      items: { create: orderItems },
    },
  });

  await prisma.cartItem.deleteMany({ where: { id: { in: consumedIds } } });

  // Saved last, and never allowed to fail the request. The order already
  // exists and the cart is already cleared by this point — if this write
  // threw, the buyer would see an error for an order that went through, and
  // a retry would place a SECOND one. An address book entry is a
  // convenience; it does not get to endanger a real order.
  if (input.saveAddress && hasProduct && name && phone && address) {
    try {
      await saveAddressForStudent(student.id, { name, phone, address, label: input.addressLabel });
    } catch (error) {
      console.error("confirmCartOrderAction: saving the address book entry failed", error);
    }
  }

  revalidatePath("/dashboard/cart");
  revalidatePath("/dashboard/thanh-toan");
  revalidatePath("/dashboard/orders");
  return { orderId: order.id };
}
