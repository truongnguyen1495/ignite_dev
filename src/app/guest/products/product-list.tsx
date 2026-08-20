import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { getPricing } from "@/lib/pricing";
import { formatVND } from "@/lib/currency";

export type GuestProductItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  badgeLabel: string | null;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
  cv: number;
};

function Thumbnail({ product }: { product: GuestProductItem }) {
  if (product.imageUrl) {
    return (
      <Image
        src={product.imageUrl}
        alt={product.title}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--info)]">
      <Package className="h-9 w-9 text-primary-foreground" />
    </div>
  );
}

// Anonymous/học-sinh catalog card — no buy button here (unlike the
// logged-in ProductBuyButton on dashboard/products/product-list.tsx): the
// bespoke landing page each card links to already owns the full "Mua ngay"
// flow, and that flow itself redirects an anonymous visitor to /login on
// click, so nothing extra is needed at the list level.
export function GuestProductList({ products }: { products: GuestProductItem[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted">Hiện chưa có sản phẩm nào.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const pricing = getPricing(product);
        return (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
              <Thumbnail product={product} />
              {product.badgeLabel && (
                <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                  {product.badgeLabel}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="font-semibold text-dark-foreground">{product.title}</p>
              {product.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-dark-muted">{product.subtitle}</p>}
              <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-4">
                {pricing.forSale ? (
                  <>
                    <span className="text-base font-semibold text-dark-foreground">
                      {formatVND(pricing.chargeAmount)}
                    </span>
                    {pricing.originalPrice && (
                      <span className="text-xs text-dark-muted line-through">{formatVND(pricing.originalPrice)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-dark-muted">Liên hệ để biết giá</span>
                )}
                <span className="text-xs text-dark-muted">CV {product.cv}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
