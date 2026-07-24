"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { addToCartAction } from "@/app/dashboard/cart/actions";
import { Button } from "@/components/ui/button";
import { PriceBlock } from "@/components/price-block";

export type BuyButtonDetails = {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  meta?: string;
  price: number;
  originalPrice?: number | null;
};

// Price display lives with the caller (course-list.tsx/library-list.tsx),
// not in here — this is just the action button, so callers can lay out
// price + button relative to each other however their card design needs.
// A single "Mua ngay" button opens a preview dialog with two real choices
// (add to cart and stay, or go straight to checkout) plus an explicit X to
// back out — not the shared app-wide useConfirm (that's a plain yes/no,
// this needs three distinct exits), so this owns its own small dialog.
//
// Rendered via createPortal straight onto document.body — course-list.tsx/
// library-list.tsx wrap a purchasable-and-viewable card (accessLevel
// "trial") in a whole-card <Link>; without a portal this dialog would be a
// real DOM descendant of that <a>, and a click on "Thêm vào giỏ hàng"/
// "Thanh toán" would bubble to the dialog's own onClick={stopPropagation},
// which stops Next.js's Link from ever running its own onClick (the one
// that calls preventDefault() to enable client-side routing) — so
// preventDefault() never fires anywhere in the chain and the BROWSER'S
// NATIVE anchor navigation for the card's href still goes through, dragging
// the buyer into the lesson/trial page instead of adding to cart / going to
// checkout. Confirmed live via Playwright on the sibling ProductBuyButton
// case (same bug, same dialog shape) before this fix — see that file's
// longer comment. Matches the lightbox portal pattern already used in
// book-element-renderer.tsx for the identical reason.
export function BuyButton({ kind, itemId, details }: { kind: OrderItemKind; itemId: string; details: BuyButtonDetails }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const addItem = (goToCheckout: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const result = await addToCartAction(kind, itemId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (goToCheckout) {
        // Lands the buyer on the cart page itself, no dialog auto-opened —
        // they review the cart and press "Xác nhận đơn hàng" there when
        // ready. Same as product-buy-button.tsx.
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(undefined);
          setOpen(true);
        }}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <Zap className="h-3.5 w-3.5" />
        Mua ngay
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
              <h2 className="pr-8 text-base font-semibold text-foreground">{details.title}</h2>
              <div className="mt-3 space-y-3 text-sm">
                {details.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={details.coverImageUrl}
                    alt={details.title}
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                {details.description && <p className="text-muted">{details.description}</p>}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  {details.meta && <span className="text-muted">{details.meta}</span>}
                  <PriceBlock price={details.price} originalPrice={details.originalPrice} />
                </div>
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
