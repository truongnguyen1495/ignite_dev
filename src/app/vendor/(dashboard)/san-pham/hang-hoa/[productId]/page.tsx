import { notFound } from "next/navigation";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { EditVendorProductForm } from "./edit-vendor-product-form";
import { DeleteVendorProductButton } from "./delete-vendor-product-button";

export default async function VendorProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { vendor } = await requireVendorAccountAccess();
  const { productId } = await params;

  // findFirst with BOTH id and sellerId in the where clause — never
  // findUnique(by id) followed by a separate ownership check, which would
  // leave a window where the two disagree under a concurrent edit.
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: vendor.id } });
  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/vendor/san-pham">Sản phẩm của tôi</BackLink>
      <PageHeader title={product.title} description="Sản phẩm vật lý — bạn tự đóng gói & giao hàng." />
      <div className="max-w-xl space-y-6">
        <EditVendorProductForm
          productId={product.id}
          title={product.title}
          subtitle={product.subtitle}
          description={product.description}
          imageUrl={product.imageUrl}
          price={product.price}
          salePrice={product.salePrice}
        />
        {product.vendorHiddenAt && (
          <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            <p className="font-medium">Admin đã ẩn sản phẩm này.</p>
            {product.vendorHiddenReason && <p className="mt-1">{product.vendorHiddenReason}</p>}
          </div>
        )}
        <div className="flex justify-end border-t border-border pt-4">
          <DeleteVendorProductButton productId={product.id} productTitle={product.title} />
        </div>
      </div>
    </div>
  );
}
