import { notFound } from "next/navigation";
import { requireLeveledStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AriaLandingPage } from "@/components/product-landing/aria-landing";
import { ActivaLandingPage } from "@/components/product-landing/activa-landing";

// Deliberately outside /dashboard entirely — a bespoke landing page needs
// its own full-bleed nav/hero with no sidebar/header squeezing it, which
// dashboard/layout.tsx's shell can't opt out of per-route (Next.js layouts
// always wrap their whole subtree). Still gated the same way every other
// học-viên-only page is: requireLeveledStudent() redirects khách/học sinh
// away exactly as it would under /dashboard.
//
// Two bespoke templates exist today ("sanarey-aria", "sanarey-activa") —
// explicit one-off scope decision, not meant to generalize into a CMS-driven
// template system yet. Any other slug 404s rather than silently rendering
// nothing.
export default async function ProductLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireLeveledStudent();
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) {
    notFound();
  }

  if (product.slug === "sanarey-aria") {
    return (
      <AriaLandingPage
        product={{
          id: product.id,
          title: product.title,
          price: product.price,
          salePrice: product.salePrice,
          cv: product.cv,
          imageUrl: product.imageUrl,
          lifestyleImage1Url: product.lifestyleImage1Url,
          lifestyleImage2Url: product.lifestyleImage2Url,
          lifestyleImage3Url: product.lifestyleImage3Url,
        }}
      />
    );
  }

  if (product.slug === "sanarey-activa") {
    return (
      <ActivaLandingPage
        product={{
          id: product.id,
          price: product.price,
          salePrice: product.salePrice,
          cv: product.cv,
        }}
      />
    );
  }

  notFound();
}
