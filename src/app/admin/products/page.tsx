import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { ProductList, type AdminProductItem } from "./product-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminProductsPage() {
  await requireAdminPermission("MANAGE_PRODUCTS");
  const products = await prisma.product.findMany({ orderBy: { order: "asc" } });

  const items: AdminProductItem[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    badgeLabel: product.badgeLabel,
    imageUrl: product.imageUrl,
    price: product.price,
    salePrice: product.salePrice,
    cv: product.cv,
    slug: product.slug,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm"
        actions={
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Link>
        }
      />

      <ProductList products={items} />
    </div>
  );
}
