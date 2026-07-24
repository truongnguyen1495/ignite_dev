"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
//
// The dialog is rendered via createPortal straight onto document.body —
// critical, not cosmetic. Catalog grids (product-list.tsx) wrap each card in
// a whole-card <Link>; without a portal this dialog would be a real DOM
// descendant of that <a>, and clicking "Thêm vào giỏ hàng"/"Thanh toán"
// inside it would bubble up through the dialog's own onClick={stopPropagation}
// — which stops Next.js's Link from ever running its own onClick (the one
// that calls preventDefault() to enable client-side routing), so
// preventDefault() never fires anywhere in the chain and the BROWSER'S
// NATIVE anchor navigation for the ancestor <a href> still went through,
// silently dragging the buyer to the card's own detail/landing page instead
// of adding to cart / going to checkout. Confirmed live on production via
// Playwright before this fix: clicking either button from the products grid
// landed on /product/sanarey-activa, not the cart. A portal makes this
// entire class of "clicked inside a modal nested in a card-link" bug
// structurally impossible — matches the lightbox pattern already used in
// book-element-renderer.tsx for the same reason.
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

  const addItem = (goToCheckout: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const result = await addToCartAction("PRODUCT", productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (goToCheckout) {
        // Lands the buyer on the cart page itself, no dialog auto-opened —
        // they review the cart and press "Xác nhận đơn hàng" there when
        // ready. Still routes through the cart (not a direct payment page)
        // since it may hold more than this one product, all checked out
        // under one address.
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

      {open &&
        createPortal(
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
          </div>,
          document.body
        )}
    </>
  );
}
