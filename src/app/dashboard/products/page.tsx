import { AlertTriangle } from "lucide-react";
import { requireActiveStudent, isSalesEnabled, getVisibleProductIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ProductList, type StudentProductItem } from "./product-list";

// Visibility uses the same shape as Course/LibraryItem (hiddenFromGuest +
// per-level/per-student grants) — see getVisibleProductIds in
// src/lib/access.ts. A fully anonymous khách gets the separate public
// /guest/products catalog instead, since this page still lives under
// /dashboard and needs a session. ?denied=1 is where
// /dashboard/products/[productId] redirects a student who lacks access to a
// specific product — same convention as dashboard/library's denied banner.
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;
  const [allProducts, salesEnabled] = await Promise.all([
    prisma.product.findMany({ orderBy: { order: "asc" } }),
    isSalesEnabled(),
  ]);

  const visibleIds = await getVisibleProductIds(student, allProducts.map((p) => p.id));
  const products = allProducts.filter((p) => visibleIds.has(p.id));

  const items: StudentProductItem[] = products.map((product) => ({
    id: product.id,
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
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem sản phẩm đó.
        </p>
      )}
      <PageHeader title="Sản phẩm" description="Danh sách sản phẩm dành cho thành viên." />
      <ProductList products={items} salesEnabled={salesEnabled} />
    </div>
  );
}
