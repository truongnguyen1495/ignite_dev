import { requireLeveledStudent, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ProductList, type StudentProductItem } from "./product-list";

// Products are a học-viên-only catalog — no per-item access grant/level
// gating exists (unlike Course/LibraryItem), so requireLeveledStudent() here
// is the entire access rule: every học viên sees every product, khách and
// học sinh never reach this route at all (dashboard/layout.tsx's học-sinh
// branch has no "Sản phẩm" nav entry, and /guest/* never links here).
export default async function ProductsPage() {
  await requireLeveledStudent();
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
