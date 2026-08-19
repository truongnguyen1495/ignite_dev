import Link from "next/link";
import Image from "next/image";
import { Package, Sparkles } from "lucide-react";
import type { Level } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { LEVEL_LABELS } from "@/lib/levels";
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
  hiddenFromGuest: boolean;
  levelGrants: Level[];
  accessGrantsCount: number;
};

// Same convention as AccessBadges in admin/courses/course-list.tsx — always
// its own row under the title so admins can see at a glance who can reach
// this product's page.
function VisibilityBadges({ product }: { product: AdminProductItem }) {
  const hasAnyRestriction =
    product.hiddenFromGuest || product.levelGrants.length > 0 || product.accessGrantsCount > 0;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {product.hiddenFromGuest && <Badge color="muted">Ẩn khỏi khách</Badge>}
      {product.levelGrants.map((level) => (
        <Badge key={level} color="primary">
          {LEVEL_LABELS[level]} trở lên
        </Badge>
      ))}
      {product.accessGrantsCount > 0 && (
        <Badge color="warning">{product.accessGrantsCount} thành viên ngoại lệ</Badge>
      )}
      {!hasAnyRestriction && <Badge color="success">Công khai</Badge>}
    </div>
  );
}

function Thumbnail({ product, className }: { product: AdminProductItem; className: string }) {
  if (product.imageUrl) {
    return (
      <Image
        src={product.imageUrl}
        alt={product.title}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--info)]`}>
      <Package className="h-9 w-9 text-on-dark-strong" />
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
              {product.slug && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge color="primary">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Landing page riêng
                  </Badge>
                </div>
              )}
              <VisibilityBadges product={product} />
              <div className="mt-auto flex flex-nowrap items-center justify-between gap-3 pt-4">
                {pricing.forSale ? (
                  <span className="text-sm font-semibold text-dark-foreground">
                    {formatVND(pricing.chargeAmount)}
                  </span>
                ) : (
                  <span className="text-xs text-dark-muted">Chưa niêm yết giá</span>
                )}
                <span className="whitespace-nowrap text-xs text-dark-muted">CV {product.cv}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
