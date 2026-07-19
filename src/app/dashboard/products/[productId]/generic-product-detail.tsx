import { Package } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { getPricing } from "@/lib/pricing";
import { formatVND } from "@/lib/currency";

export type GenericProduct = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badgeLabel: string | null;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
  cv: number;
};

// Every product without a bespoke landing page (see AriaLandingPage) falls
// back to this plain view — matches the dark card treatment already used on
// the /dashboard/products listing and on Course/Library, so it doesn't look
// like a dead end after the marketplace-style grid.
export function GenericProductDetail({ product }: { product: GenericProduct }) {
  const pricing = getPricing(product);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink href="/dashboard/products">Quay lại</BackLink>

      <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface">
        <div className="relative aspect-video w-full overflow-hidden bg-dark-surface-raised">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--info)]">
              <Package className="h-12 w-12 text-white/90" />
            </div>
          )}
          {product.badgeLabel && (
            <span className="absolute left-4 top-4 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
              {product.badgeLabel}
            </span>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold text-dark-foreground">{product.title}</h1>
            {product.subtitle && <p className="mt-1 text-sm text-dark-muted">{product.subtitle}</p>}
          </div>
          {product.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-dark-muted">{product.description}</p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-dark-border pt-4">
            {pricing.forSale ? (
              <>
                <span className="text-lg font-semibold text-dark-foreground">{formatVND(pricing.chargeAmount)}</span>
                {pricing.originalPrice && (
                  <span className="text-sm text-dark-muted line-through">{formatVND(pricing.originalPrice)}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-dark-muted">Liên hệ để biết giá</span>
            )}
            <span className="text-xs text-slate-400">CV {product.cv}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
