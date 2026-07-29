import { requireActiveStudent, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ProductList, type StudentProductItem } from "./product-list";

// Products have no per-item access grant/level gating (unlike Course/
// LibraryItem) — every signed-in student sees every product regardless of
// level, so requireActiveStudent() (not requireLeveledStudent()) is the
// entire access rule here. "Học sinh" (no-cấp) reach this route too now via
// the "Sản phẩm" entry in dashboard/layout.tsx's học-sinh nav; a fully
// anonymous khách gets the separate public /guest/products catalog instead,
// since this page still lives under /dashboard and needs a session.
export default async function ProductsPage() {
  await requireActiveStudent();
  const [products, salesEnabled] = await Promise.all([
    prisma.product.findMany({ orderBy: { order: "asc" } }),
    isSalesEnabled(),
  ]);

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
      <PageHeader title="Sản phẩm" description="Danh sách sản phẩm dành cho học viên." />
      <ProductList products={items} salesEnabled={salesEnabled} />
    </div>
  );
}
