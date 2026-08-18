import { redirect } from "next/navigation";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/pricing";
import { canPayOnDelivery } from "@/lib/orders";
import { BackLink } from "@/components/ui/back-link";
import { CheckoutForm, type CheckoutLine, type SavedAddress } from "./checkout-form";

// Reads the live cart and the buyer's own address book on every visit —
// never prerendered, same reason as the rest of /dashboard.
export const dynamic = "force-dynamic";

/**
 * The one checkout screen. Three routes lead here — the cart's "Thanh toán",
 * a product's "Mua ngay", and the return trip after logging in — and all of
 * them get the same review-address-method-confirm sequence instead of the
 * shipping form that used to be bolted onto the cart list.
 *
 * Everything shown is recomputed from live data rather than passed in: a
 * price that changed, or an item bought elsewhere in another tab, must not
 * be able to reach the order through a stale render.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");
  // "Mua riêng món này" arrives with one cart line named; everything else
  // checks out the whole basket.
  const { item: onlyCartItemId } = await searchParams;

  const [cartItems, addresses] = await prisma.$transaction([
    prisma.cartItem.findMany({
      where: { studentId: student.id, ...(onlyCartItemId ? { id: onlyCartItemId } : {}) },
      include: { course: true, libraryItem: true, product: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.address.findMany({
      where: { studentId: student.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        recipientName: true,
        recipientPhone: true,
        addressLine: true,
        isDefault: true,
      },
    }),
  ]);

  // Lines that can't be sold right now are dropped from the summary rather
  // than shown greyed out: confirmCartOrderAction clears them from the cart
  // anyway, so listing them here would only promise a total the order won't
  // charge.
  const lines: CheckoutLine[] = [];
  for (const item of cartItems) {
    const source = item.course ?? item.libraryItem ?? item.product;
    if (!source) continue;
    const pricing = getPricing(source);
    if (!pricing.forSale) continue;
    lines.push({
      id: item.id,
      kind: item.kind,
      title: source.title,
      unitPrice: pricing.chargeAmount,
      quantity: item.quantity,
    });
  }

  // An empty (or entirely unsellable) cart has nothing to check out; bounce
  // back rather than render a form that can only fail.
  if (lines.length === 0) {
    redirect("/dashboard/cart");
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const needsShipping = lines.some((line) => line.kind === "PRODUCT");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/dashboard/cart">Giỏ hàng</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Thanh toán</h1>
        {onlyCartItemId && (
          <p className="mt-1 text-sm text-muted">
            Bạn đang mua riêng món này — những món khác trong giỏ vẫn giữ nguyên.
          </p>
        )}
      </div>

      <CheckoutForm
        onlyCartItemId={onlyCartItemId}
        lines={lines}
        total={total}
        needsShipping={needsShipping}
        codAllowed={canPayOnDelivery(lines)}
        addresses={addresses as SavedAddress[]}
        defaultName={student.name}
      />
    </div>
  );
}
