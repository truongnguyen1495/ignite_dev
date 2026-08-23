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
import { resolveAdministrativeUnit } from "@/lib/administrative-units";
import { composeAddressLine } from "@/lib/address";
import { computeShippingFee, countPhysicalUnits } from "@/lib/shipping";
import { VN_PHONE_REGEX, normalizePhoneNumber } from "@/lib/validation";
import type { PaymentMethod } from "@prisma/client";

/** What the checkout form collects for a parcel. */
export type ShippingDetails = {
  name: string;
  phone: string;
  /** Official GSO codes; the names are looked up server-side, never sent. */
  provinceCode: string;
  wardCode: string;
  street: string;
};

/**
 * A delivery address that has been proven real: both codes exist, the ward
 * belongs to the province, and the names come from the directory rather
 * than from the request. This is the only shape allowed to reach an Order.
 */
type ResolvedShipping = {
  name: string;
  phone: string;
  provinceCode: string | null;
  provinceName: string | null;
  wardCode: string | null;
  wardName: string | null;
  street: string | null;
  addressLine: string;
};

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
 * Validates a freshly typed address against the administrative directory.
 *
 * Returns the reason it failed rather than a boolean, because "địa chỉ
 * không hợp lệ" tells a buyer nothing about which of five fields to fix.
 * The province/ward NAMES are taken from the directory, never from the
 * request: the codes are all the client is trusted with, so a tampered
 * form cannot put "Phường Hải Châu, Thành phố Hà Nội" onto a real order.
 */
function resolveTypedShipping(
  shipping: ShippingDetails
): { ok: true; value: ResolvedShipping } | { ok: false; error: string } {
  const name = shipping.name.trim();
  const phone = shipping.phone.trim();
  const street = shipping.street.trim();

  if (!name) return { ok: false, error: "Vui lòng nhập tên người nhận." };
  if (!VN_PHONE_REGEX.test(phone)) {
    return { ok: false, error: "Số điện thoại không hợp lệ. Định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx." };
  }
  if (!shipping.provinceCode) return { ok: false, error: "Vui lòng chọn Tỉnh/Thành phố." };
  if (!shipping.wardCode) return { ok: false, error: "Vui lòng chọn Phường/Xã." };
  if (!street) return { ok: false, error: "Vui lòng nhập số nhà, tên đường." };

  const unit = resolveAdministrativeUnit(shipping.provinceCode, shipping.wardCode);
  if (!unit) {
    return { ok: false, error: "Tỉnh/Thành phố hoặc Phường/Xã không hợp lệ, vui lòng chọn lại." };
  }

  return {
    ok: true,
    value: {
      name,
      // Stored in the same 0-prefixed form as every other phone number in
      // the app, so "+84…" and "0…" are one number, not two.
      phone: normalizePhoneNumber(phone),
      provinceCode: shipping.provinceCode,
      provinceName: unit.provinceName,
      wardCode: shipping.wardCode,
      wardName: unit.wardName,
      street,
      addressLine: composeAddressLine({
        street,
        wardName: unit.wardName,
        provinceName: unit.provinceName,
      }),
    },
  };
}

/**
 * Turns whichever way the buyer supplied an address into the one shape the
 * order needs. A saved address is re-read from the database rather than
 * trusted from the form — the client sends only an id, so nothing about
 * where a parcel goes comes from user-supplied text in that path.
 *
 * A saved entry written before addresses were structured has only the
 * free-text line; it is carried through as-is (with null codes) rather than
 * rejected, so an old address book keeps working and simply doesn't gain
 * the structure retroactively.
 */
async function resolveShipping(
  studentId: string,
  input: CheckoutInput
): Promise<{ ok: true; value?: ResolvedShipping } | { ok: false; error: string }> {
  if (input.addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: input.addressId, studentId },
      select: {
        recipientName: true,
        recipientPhone: true,
        addressLine: true,
        provinceCode: true,
        provinceName: true,
        wardCode: true,
        wardName: true,
        street: true,
      },
    });
    if (saved) {
      return {
        ok: true,
        value: {
          name: saved.recipientName,
          phone: saved.recipientPhone,
          provinceCode: saved.provinceCode,
          provinceName: saved.provinceName,
          wardCode: saved.wardCode,
          wardName: saved.wardName,
          street: saved.street,
          addressLine: saved.addressLine,
        },
      };
    }
    // Fall through to the typed address rather than failing: the saved one
    // may have been deleted in another tab while this page sat open.
  }
  if (!input.shipping) return { ok: true };
  return resolveTypedShipping(input.shipping);
}

/**
 * Adds an address to the buyer's book, making it the default when it is
 * their first. Skips an exact duplicate so repeated checkouts to the same
 * place don't grow the list.
 */
async function saveAddressForStudent(
  studentId: string,
  entry: ResolvedShipping & { label?: string }
): Promise<void> {
  const duplicate = await prisma.address.findFirst({
    where: {
      studentId,
      recipientName: entry.name,
      recipientPhone: entry.phone,
      addressLine: entry.addressLine,
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
      addressLine: entry.addressLine,
      provinceCode: entry.provinceCode,
      provinceName: entry.provinceName,
      wardCode: entry.wardCode,
      wardName: entry.wardName,
      street: entry.street,
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
  // One read where there used to be two: isSalesEnabled() fetches this exact
  // row, and the shipping policy needs two more columns off it. Under
  // connection_limit=1 the queries in this action run strictly one after
  // another, so a round trip removed is a round trip nobody waits for.
  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { salesEnabled: true, shippingFee: true, freeShippingFromItems: true },
  });
  if (!settings?.salesEnabled) {
    return { error: "Hệ thống bán hàng hiện đang tắt." };
  }

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
  // Marketplace "Nhà bán hàng" — sellerId is snapshotted from the catalog
  // row's own sellerId right here, the only place an OrderItem is ever
  // created, same reasoning as titleSnapshot/priceAtPurchase: whoever this
  // line was actually bought from must not silently change later. Left
  // undefined (not just omitted) for a platform-authored row so Prisma
  // writes a real NULL, matching every row that predates this feature.
  const orderItems: {
    kind: OrderItemKind;
    courseId?: string;
    libraryItemId?: string;
    productId?: string;
    titleSnapshot: string;
    priceAtPurchase: number;
    quantity: number;
    sellerId?: string | null;
  }[] = [];

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
        sellerId: item.course.sellerId,
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
        sellerId: item.libraryItem.sellerId,
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
        sellerId: item.product.sellerId,
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

  // Resolved only once the cart is known to hold something physical —
  // an order of nothing but courses has nowhere to be delivered, and
  // validating (or looking up) an address it will never use would be one
  // more query and one more way to fail for no reason.
  const hasProduct = orderItems.some((i) => i.kind === "PRODUCT");
  let shipping: ResolvedShipping | undefined;
  if (hasProduct) {
    const resolved = await resolveShipping(student.id, input);
    if (!resolved.ok) {
      return { error: resolved.error };
    }
    if (!resolved.value) {
      return { error: "Vui lòng nhập đầy đủ thông tin giao hàng." };
    }
    shipping = resolved.value;
  }

  // Re-checked against what the cart ACTUALLY still contains, not against
  // what the page rendered: an item could have gone stale between the two,
  // and this form is a plain POST either way.
  const payOnDelivery = input.paymentMethod === "COD";
  if (payOnDelivery && !canPayOnDelivery(orderItems)) {
    return { error: "Đơn có khóa học hoặc sách số nên không dùng được hình thức trả khi nhận hàng." };
  }

  // Delivery is priced from the settings row read at the top of this
  // action, not from anything the form posted, and snapshotted onto the
  // order below — an admin changing the rate tomorrow must not change what
  // this buyer was charged today. totalAmount deliberately INCLUDES it, so
  // the QR amount, the COD amount and any refund all stay correct without
  // knowing shipping exists.
  const goodsTotal = orderItems.reduce((sum, i) => sum + orderItemTotal(i), 0);
  const shippingFee = computeShippingFee(
    { fee: settings.shippingFee, freeFromItems: settings.freeShippingFromItems },
    countPhysicalUnits(orderItems)
  );
  const totalAmount = goodsTotal + shippingFee;
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
      shippingFee,
      ...(shipping
        ? {
            shippingName: shipping.name,
            shippingPhone: shipping.phone,
            shippingAddress: shipping.addressLine,
            shippingProvinceCode: shipping.provinceCode,
            shippingProvinceName: shipping.provinceName,
            shippingWardCode: shipping.wardCode,
            shippingWardName: shipping.wardName,
            shippingStreet: shipping.street,
          }
        : {}),
      items: { create: orderItems },
    },
  });

  await prisma.cartItem.deleteMany({ where: { id: { in: consumedIds } } });

  // Saved last, and never allowed to fail the request. The order already
  // exists and the cart is already cleared by this point — if this write
  // threw, the buyer would see an error for an order that went through, and
  // a retry would place a SECOND one. An address book entry is a
  // convenience; it does not get to endanger a real order.
  if (input.saveAddress && !input.addressId && shipping) {
    try {
      await saveAddressForStudent(student.id, { ...shipping, label: input.addressLabel });
    } catch (error) {
      console.error("confirmCartOrderAction: saving the address book entry failed", error);
    }
  }

  revalidatePath("/dashboard/cart");
  revalidatePath("/dashboard/thanh-toan");
  revalidatePath("/dashboard/orders");
  return { orderId: order.id };
}

export type CheckoutNowResult = {
  error?: string;
  needsLogin?: boolean;
  /** The buyer still has to fill in a delivery address — send them to /dashboard/thanh-toan?item=… */
  cartItemId?: string;
  /** The order already exists — send them straight to /dashboard/orders/[id]. */
  orderId?: string;
};

/**
 * "Thanh toán" in the buy dialog: get this one item to a payment screen in
 * as few steps as the item allows.
 *
 * A course or a book has nothing to ask about — no address, and pay-on-
 * delivery is refused for digital goods anyway (canPayOnDelivery) — so the
 * checkout page would be a form with one button on it. Those skip it: the
 * order is created here and the buyer lands on the QR. A physical product
 * still needs somewhere to be delivered, so it stops at checkout with the
 * line already in the cart.
 *
 * Both halves run in one Server Action rather than the client calling two:
 * a "buy" that is two round trips can be interrupted between them, leaving
 * a cart line the buyer never asked to keep.
 *
 * The order this creates is a real, cancellable one — deliberately, since
 * the dialog IS the confirmation step. It is not free-floating either: a
 * bank-transfer order carries a 30-minute deadline and expires itself
 * (ORDER_PENDING_EXPIRY_MINUTES), so a misfire costs a row that cleans
 * itself up, not a debt.
 */
export async function checkoutNowAction(
  kind: OrderItemKind,
  itemId: string
): Promise<CheckoutNowResult> {
  const added = await addToCartAction(kind, itemId);
  if (added.needsLogin) return { needsLogin: true };
  if (added.error || !added.cartItemId) return { error: added.error ?? "Không thêm được vào giỏ hàng." };

  if (kind === "PRODUCT") {
    return { cartItemId: added.cartItemId };
  }

  const result = await confirmCartOrderAction({
    paymentMethod: "BANK_TRANSFER",
    onlyCartItemId: added.cartItemId,
  });
  if (result.error || !result.orderId) {
    // The line is safely in the cart either way, so hand back its id: the
    // caller can fall back to the full checkout screen instead of stranding
    // a buyer on a dialog that only knows how to say no.
    return { error: result.error, cartItemId: added.cartItemId };
  }
  return { orderId: result.orderId };
}
