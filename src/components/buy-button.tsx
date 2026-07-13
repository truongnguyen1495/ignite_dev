"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { createOrderAction } from "@/app/dashboard/orders/actions";
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
// `details` feeds the confirm dialog shown before an order is created, so
// the student sees what they're buying instead of an order appearing right
// after a misclick.
export function BuyButton({ kind, itemId, details }: { kind: OrderItemKind; itemId: string; details: BuyButtonDetails }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(undefined);

    const ok = await confirm({
      title: details.title,
      tone: "primary",
      confirmLabel: "Mua ngay",
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
      const result = await createOrderAction(kind, itemId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/orders/${result.orderId}`);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {pending ? "Đang xử lý..." : "Mua ngay"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
