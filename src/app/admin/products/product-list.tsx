import Link from "next/link";
import { Package, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPricing } from "@/lib/pricing";
import { formatVND } from "@/lib/currency";

export type AdminProductItem = {
  id: string;
  title: string;
  subtitle: string | null;
  badgeLabel: string | null;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
  cv: number;
  slug: string | null;
};

function Thumbnail({ product, className }: { product: AdminProductItem; className: string }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={product.imageUrl} alt={product.title} className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--info)]`}>
      <Package className="h-9 w-9 text-white/90" />
    </div>
  );
}

export function ProductList({ products }: { products: AdminProductItem[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted">Chưa có sản phẩm nào.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const pricing = getPricing(product);
        return (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
              <Thumbnail product={product} className="h-full w-full" />
              {product.badgeLabel && (
                <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                  {product.badgeLabel}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="font-semibold text-dark-foreground">{product.title}</p>
              {product.subtitle && <p className="mt-0.5 text-sm text-dark-muted">{product.subtitle}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {product.slug && (
                  <Badge color="primary">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Landing page riêng
                  </Badge>
                )}
              </div>
              <div className="mt-auto flex flex-nowrap items-center justify-between gap-3 pt-4">
                {pricing.forSale ? (
                  <span className="text-sm font-semibold text-dark-foreground">
                    {formatVND(pricing.chargeAmount)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Chưa niêm yết giá</span>
                )}
                <span className="whitespace-nowrap text-xs text-slate-300">CV {product.cv}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
