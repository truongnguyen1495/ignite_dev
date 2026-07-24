import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getPricing } from "@/lib/pricing";
import { CartList, type CartListItem } from "./cart-list";
import type { ShippingDetails } from "./actions";

export default async function CartPage() {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");

  const cartItems = await prisma.cartItem.findMany({
    where: { studentId: student.id },
    include: { course: true, libraryItem: true, product: true },
    orderBy: { createdAt: "asc" },
  });

  // The buyer's "saved" shipping address = the one on their most recent
  // shipped (physical) order. Lets checkout skip re-asking a returning buyer
  // for an address they've already given, offering a one-tap confirm
  // instead — see CartList. Null for anyone who has never ordered a physical
  // item, who then gets the full shipping form.
  const lastShipped = await prisma.order.findFirst({
    where: { studentId: student.id, deletedAt: null, shippingAddress: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { shippingName: true, shippingPhone: true, shippingAddress: true },
  });
  const savedShipping: ShippingDetails | null =
    lastShipped?.shippingName && lastShipped.shippingPhone && lastShipped.shippingAddress
      ? { name: lastShipped.shippingName, phone: lastShipped.shippingPhone, address: lastShipped.shippingAddress }
      : null;

  const items: CartListItem[] = cartItems.map((c) => {
    if (c.kind === "COURSE") {
      const pricing = c.course ? getPricing(c.course) : null;
      return {
        id: c.id,
        kind: c.kind,
        title: c.course?.title ?? "Khóa học đã bị xóa",
        description: c.course?.description ?? null,
        imageUrl: c.course?.coverImageUrl ?? null,
        price: pricing?.forSale ? pricing.chargeAmount : 0,
        originalPrice: (pricing?.forSale && pricing.originalPrice) || null,
        unavailable: !pricing?.forSale,
      };
    }
    if (c.kind === "LIBRARY_ITEM") {
      const pricing = c.libraryItem ? getPricing(c.libraryItem) : null;
      return {
        id: c.id,
        kind: c.kind,
        title: c.libraryItem?.title ?? "Tài liệu đã bị xóa",
        description: c.libraryItem?.description ?? null,
        imageUrl: c.libraryItem?.coverImageUrl ?? null,
        price: pricing?.forSale ? pricing.chargeAmount : 0,
        originalPrice: (pricing?.forSale && pricing.originalPrice) || null,
        unavailable: !pricing?.forSale,
      };
    }
    const pricing = c.product ? getPricing(c.product) : null;
    return {
      id: c.id,
      kind: c.kind,
      title: c.product?.title ?? "Sản phẩm đã bị xóa",
      description: c.product?.subtitle ?? c.product?.description ?? null,
      imageUrl: c.product?.imageUrl ?? null,
      price: pricing?.forSale ? pricing.chargeAmount : 0,
      originalPrice: (pricing?.forSale && pricing.originalPrice) || null,
      unavailable: !pricing?.forSale,
    };
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Giỏ hàng"
        actions={
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Đơn hàng của tôi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {/* CartList reads useSearchParams (for the ?checkout=1 auto-open) —
          wrapped in Suspense so a static-prerender pass never errors on the
          missing boundary, regardless of how the route gets rendered. */}
      <Suspense fallback={null}>
        <CartList items={items} savedShipping={savedShipping} />
      </Suspense>
    </div>
  );
}
