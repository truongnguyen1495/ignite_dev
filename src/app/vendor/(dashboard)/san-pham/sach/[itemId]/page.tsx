import { notFound } from "next/navigation";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { EditVendorLibraryItemForm } from "./edit-vendor-library-item-form";
import { DeleteVendorLibraryItemButton } from "./delete-vendor-library-item-button";

export default async function VendorLibraryItemDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { vendor } = await requireVendorAccountAccess();
  const { itemId } = await params;

  const item = await prisma.libraryItem.findFirst({ where: { id: itemId, sellerId: vendor.id } });
  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/vendor/san-pham">Sản phẩm của tôi</BackLink>
      <PageHeader title={item.title} description="Sách / tài liệu điện tử — khách mua được truy cập ngay, không cần giao hàng." />
      <div className="max-w-xl space-y-6">
        <EditVendorLibraryItemForm
          libraryItemId={item.id}
          title={item.title}
          author={item.author}
          description={item.description}
          coverImageUrl={item.coverImageUrl}
          filePath={item.filePath}
          pageCount={item.pageCount}
          price={item.price}
          salePrice={item.salePrice}
        />
        {item.vendorHiddenAt && (
          <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            <p className="font-medium">Admin đã ẩn mục này.</p>
            {item.vendorHiddenReason && <p className="mt-1">{item.vendorHiddenReason}</p>}
          </div>
        )}
        <div className="flex justify-end border-t border-border pt-4">
          <DeleteVendorLibraryItemButton libraryItemId={item.id} title={item.title} />
        </div>
      </div>
    </div>
  );
}
