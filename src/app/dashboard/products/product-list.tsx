"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, ArrowRight } from "lucide-react";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { ProductBuyButton } from "@/components/product-buy-button";
import { getPricing } from "@/lib/pricing";
import { formatVND } from "@/lib/currency";

const STORAGE_KEY = "student-products-view";

export type StudentProductItem = {
  id: string;
  title: string;
  subtitle: string | null;
  badgeLabel: string | null;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
  cv: number;
};

function Thumbnail({ product, className }: { product: StudentProductItem; className: string }) {
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

function PriceRow({ product }: { product: StudentProductItem }) {
  const pricing = getPricing(product);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {pricing.forSale ? (
        <>
          <span className="text-base font-semibold text-dark-foreground">{formatVND(pricing.chargeAmount)}</span>
          {pricing.originalPrice && (
            <span className="text-xs text-dark-muted line-through">{formatVND(pricing.originalPrice)}</span>
          )}
        </>
      ) : (
        <span className="text-xs text-dark-muted">Liên hệ để biết giá</span>
      )}
      <span className="text-xs text-slate-400">CV {product.cv}</span>
    </div>
  );
}

export function ProductList({
  products,
  salesEnabled,
}: {
  products: StudentProductItem[];
  salesEnabled: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  function handleChange(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted">Hiện chưa có sản phẩm nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={handleChange} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const pricing = getPricing(product);
            const purchasable = salesEnabled && pricing.forSale;
            return (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
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
                  <div className="mt-auto space-y-3 pt-4">
                    <PriceRow product={product} />
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-400">
                      Xem chi tiết
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    {purchasable && (
                      <div className="border-t border-dark-border pt-3">
                        <ProductBuyButton
                          productId={product.id}
                          title={product.title}
                          price={pricing.chargeAmount}
                          originalPrice={pricing.originalPrice}
                          className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                          Mua ngay
                        </ProductBuyButton>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const pricing = getPricing(product);
            const purchasable = salesEnabled && pricing.forSale;
            return (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
                className="flex items-center gap-4 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors hover:border-primary/60"
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                  <Thumbnail product={product} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {product.badgeLabel && (
                      <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        {product.badgeLabel}
                      </span>
                    )}
                    <p className="truncate font-semibold text-dark-foreground">{product.title}</p>
                  </div>
                  {product.subtitle && <p className="line-clamp-1 text-sm text-dark-muted">{product.subtitle}</p>}
                </div>
                <div className="hidden shrink-0 sm:block">
                  <PriceRow product={product} />
                </div>
                {purchasable && (
                  <ProductBuyButton
                    productId={product.id}
                    title={product.title}
                    price={pricing.chargeAmount}
                    originalPrice={pricing.originalPrice}
                    className="hidden shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:block"
                  >
                    Mua ngay
                  </ProductBuyButton>
                )}
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
