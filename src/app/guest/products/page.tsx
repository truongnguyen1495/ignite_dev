import { prisma } from "@/lib/prisma";
import { GuestProductList } from "./product-list";

// No dynamic API (searchParams/cookies/headers) is read here, so without
// this Next.js would prerender it once at build time — an admin editing a
// product afterward would never show up here (same reasoning as
// guest/courses/page.tsx).
export const dynamic = "force-dynamic";

export default async function GuestProductsPage() {
  // Only bespoke (slugged) products have a public detail page today
  // (/product/[slug] — src/app/product/[slug]/page.tsx). A slug-less
  // "generic" product's detail view still lives behind
  // /dashboard/products/[productId], which requires an account, so it's
  // filtered out here rather than linking a guest into a page that would
  // just bounce them to /login. None exist yet; if one gets added it simply
  // won't appear on this public list until it also gets a public route.
  const products = await prisma.product.findMany({
    where: { slug: { not: null }, hiddenFromGuest: false },
    orderBy: { order: "asc" },
  });

  const items = products.map((product) => ({
    id: product.id,
    slug: product.slug!,
    title: product.title,
    subtitle: product.subtitle,
    badgeLabel: product.badgeLabel,
    imageUrl: product.imageUrl,
    price: product.price,
    salePrice: product.salePrice,
    cv: product.cv,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sản phẩm</h1>
      </div>
      <GuestProductList products={items} />
    </div>
  );
}
