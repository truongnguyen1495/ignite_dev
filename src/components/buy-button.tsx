"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Zap, Loader2 } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { addToCartAction } from "@/app/dashboard/cart/actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
// `details` feeds the confirm dialog shown before an item is added to the
// cart, so the student sees what they're adding instead of it happening
// right after a misclick. Adding to cart never navigates away — the student
// reviews everything (and can still back out) on /dashboard/cart before an
// Order is ever created (see confirmCartOrderAction).
export function BuyButton({ kind, itemId, details }: { kind: OrderItemKind; itemId: string; details: BuyButtonDetails }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  // Shared by both buttons — they only differ in what happens after a
  // successful add: "Thêm vào giỏ hàng" stays put (existing behavior, cart
  // review happens later on /dashboard/cart), "Mua ngay" jumps straight to
  // that same cart/checkout page instead of toasting and staying.
  const addItem = async (confirmLabel: string, goToCartAfter: boolean) => {
    setError(undefined);
    const ok = await confirm({
      title: details.title,
      tone: "primary",
      confirmLabel,
      cancelLabel: "Để sau",
      description: (
        <div className="space-y-3">
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
      ),
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await addToCartAction(kind, itemId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (goToCartAfter) {
        router.push("/dashboard/cart");
        return;
      }
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 3000);
    });
  };

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void addItem("Thêm vào giỏ hàng", false);
  };

  const onBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void addItem("Mua ngay", true);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={pending}
          title="Thêm vào giỏ hàng"
          aria-label="Thêm vào giỏ hàng"
          className="flex shrink-0 items-center justify-center rounded-lg border border-border p-1.5 text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : added ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onBuyNow}
          disabled={pending}
          title="Mua ngay"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Zap className="h-3.5 w-3.5" />
          Mua ngay
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
