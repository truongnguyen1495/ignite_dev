import { notFound, redirect } from "next/navigation";
import { requireLeveledStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { GenericProductDetail } from "./generic-product-detail";

// A product with a slug has a bespoke landing page living outside the
// dashboard shell entirely (see src/app/product/[slug]/page.tsx) — full
// custom nav/hero, no sidebar. This route just redirects there so the
// catalog card's stable /dashboard/products/{id} link keeps working either
// way. Everything else renders inline, in the normal dashboard shell.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireLeveledStudent();
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    notFound();
  }
  if (product.slug) {
    redirect(`/product/${product.slug}`);
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
    />
  );
}
