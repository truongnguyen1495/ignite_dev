import { notFound } from "next/navigation";
import { requireLeveledStudent, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AriaLandingPage } from "@/components/product-landing/aria-landing";
import { ActivaLandingPage } from "@/components/product-landing/activa-landing";
import { SimetraLandingPage } from "@/components/product-landing/simetra-landing";
import { Br9LandingPage } from "@/components/product-landing/br9-landing";
import { FloatingCartButton } from "@/components/floating-cart-button";

// Deliberately outside /dashboard entirely — a bespoke landing page needs
// its own full-bleed nav/hero with no sidebar/header squeezing it, which
// dashboard/layout.tsx's shell can't opt out of per-route (Next.js layouts
// always wrap their whole subtree). Still gated the same way every other
// học-viên-only page is: requireLeveledStudent() redirects khách/học sinh
// away exactly as it would under /dashboard.
//
// Four bespoke templates exist today ("sanarey-aria", "sanarey-activa",
// "sanarey-simetra", "sanarey-br9") — explicit one-off scope decision, not
// meant to generalize into a CMS-driven template system yet. Any other slug
// 404s rather than silently rendering nothing.
export default async function ProductLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireLeveledStudent();
  const { slug } = await params;
  const [product, salesEnabled] = await Promise.all([
    prisma.product.findUnique({ where: { slug } }),
    isSalesEnabled(),
  ]);
  if (!product) {
    notFound();
  }

  if (product.slug === "sanarey-aria") {
    return (
      <>
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
          salesEnabled={salesEnabled}
        />
        <FloatingCartButton />
      </>
    );
  }

  if (product.slug === "sanarey-activa") {
    return (
      <>
        <ActivaLandingPage
          product={{
            id: product.id,
            price: product.price,
            salePrice: product.salePrice,
            cv: product.cv,
          }}
          salesEnabled={salesEnabled}
        />
        <FloatingCartButton />
      </>
    );
  }

  if (product.slug === "sanarey-simetra") {
    return (
      <>
        <SimetraLandingPage
          product={{
            id: product.id,
            price: product.price,
            salePrice: product.salePrice,
            cv: product.cv,
          }}
          salesEnabled={salesEnabled}
        />
        <FloatingCartButton />
      </>
    );
  }

  if (product.slug === "sanarey-br9") {
    return (
      <>
        <Br9LandingPage
          product={{
            id: product.id,
            price: product.price,
            salePrice: product.salePrice,
            cv: product.cv,
          }}
          salesEnabled={salesEnabled}
        />
        <FloatingCartButton />
      </>
    );
  }

  notFound();
}
