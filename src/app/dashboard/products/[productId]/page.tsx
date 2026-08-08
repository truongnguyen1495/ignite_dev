import { notFound, redirect } from "next/navigation";
import { requireActiveStudent, isSalesEnabled, canViewProduct } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { GenericProductDetail } from "./generic-product-detail";

// A product with a slug has a bespoke landing page living outside the
// dashboard shell entirely (see src/app/product/[slug]/page.tsx) — full
// custom nav/hero, no sidebar. This route just redirects there so the
// catalog card's stable /dashboard/products/{id} link keeps working either
// way (that target page does its own canViewProduct check). Everything else
// renders inline, in the normal dashboard shell — and needs the same
// canViewProduct gate here directly, since a generic (slug-less) product
// has no other page to inherit it from.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const student = await requireActiveStudent();
  const { productId } = await params;
  const [product, salesEnabled] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    isSalesEnabled(),
  ]);
  if (!product) {
    notFound();
  }
  if (product.slug) {
    redirect(`/product/${product.slug}`);
  }
  if (!(await canViewProduct(student, product.id))) {
    redirect("/dashboard/products?denied=1");
  }

  return (
    <GenericProductDetail
      product={{
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        badgeLabel: product.badgeLabel,
        imageUrl: product.imageUrl,
        price: product.price,
        salePrice: product.salePrice,
        cv: product.cv,
      }}
      salesEnabled={salesEnabled}
    />
  );
}
