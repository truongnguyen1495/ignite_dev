import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { EditProductForm } from "./edit-product-form";
import { DeleteProductButton } from "./delete-product-button";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdminPermission("MANAGE_PRODUCTS");
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/admin/products">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{product.title}</h1>
      </div>

      <Card padding="lg">
        <EditProductForm
          productId={product.id}
          title={product.title}
          subtitle={product.subtitle}
          description={product.description}
          badgeLabel={product.badgeLabel}
          imageUrl={product.imageUrl}
          order={product.order}
          price={product.price}
          salePrice={product.salePrice}
          cv={product.cv}
          slug={product.slug}
          lifestyleImage1Url={product.lifestyleImage1Url}
          lifestyleImage2Url={product.lifestyleImage2Url}
          lifestyleImage3Url={product.lifestyleImage3Url}
        />
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteProductButton productId={product.id} productTitle={product.title} />
      </Card>
    </div>
  );
}
