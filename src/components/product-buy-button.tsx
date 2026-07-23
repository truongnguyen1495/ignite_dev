"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addToCartAction } from "@/app/dashboard/cart/actions";
import { Button } from "@/components/ui/button";
import { PriceBlock } from "@/components/price-block";

// Trigger button for a Product — kept as its own component (not BuyButton)
// so each bespoke landing page (Aria/Activa/Simetra/BR-9) can render it as
// its own styled `.btn` element via className/children instead of a fixed
// look. The dialog it opens, though, is the same app-standard light-themed
// one BuyButton uses (image/description-free here — the product's own page
// already shows all of that) with an explicit X to back out and two real
// choices: add to cart and stay, or go straight to checkout. Shipping
// address isn't collected here — asked once for the whole cart at checkout
// (see confirmCartOrderAction), since a cart can mix several products under
// one address.
export function ProductBuyButton({
  productId,
  title,
  price,
  originalPrice,
  className,
  children,
}: {
  productId: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const addItem = (goToCartAfter: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const result = await addToCartAction("PRODUCT", productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (goToCartAfter) {
        router.push("/dashboard/cart");
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          // Guards against being nested inside a card-wide <Link> (e.g. the
          // /dashboard/products catalog grid) — without this, clicking would
          // both open the dialog and navigate away.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="pr-8 text-base font-semibold text-foreground">{title}</h2>
            <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
              <PriceBlock price={price} originalPrice={originalPrice} />
            </div>
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => addItem(false)}>
                Thêm vào giỏ hàng
              </Button>
              <Button type="button" variant="primary" disabled={pending} isLoading={pending} onClick={() => addItem(true)}>
                Thanh toán
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
