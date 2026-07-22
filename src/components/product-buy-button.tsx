"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/dashboard/cart/actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PriceBlock } from "@/components/price-block";

// Adds a Product to the cart — same confirm-then-add flow as BuyButton
// (Course/LibraryItem), just kept as its own component so each bespoke
// landing page (Aria/Activa/Simetra/BR-9) can render it as its own styled
// `.btn` element via className/children instead of BuyButton's fixed look.
// Shipping address is no longer collected here — it's asked once for the
// whole cart at checkout (see confirmCartOrderAction), since a cart can mix
// several physical products under one address.
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async () => {
    setError(undefined);
    const ok = await confirm({
      title,
      tone: "primary",
      confirmLabel: "Thêm vào giỏ hàng",
      cancelLabel: "Để sau",
      description: (
        <div className="flex items-center justify-end border-t border-border pt-3">
          <PriceBlock price={price} originalPrice={originalPrice} />
        </div>
      ),
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await addToCartAction("PRODUCT", productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={onClick} disabled={pending}>
        {children}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
