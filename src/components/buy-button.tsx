"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { createOrderAction } from "@/app/dashboard/orders/actions";
import { formatVND } from "@/lib/currency";

export function BuyButton({
  kind,
  itemId,
  price,
  originalPrice,
}: {
  kind: OrderItemKind;
  itemId: string;
  price: number;
  originalPrice?: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(undefined);
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
        {pending ? (
          "Đang xử lý..."
        ) : (
          <span className="flex items-baseline gap-1">
            Mua ngay ·
            {originalPrice != null && (
              <span className="text-[10px] line-through opacity-70">{formatVND(originalPrice)}</span>
            )}
            {formatVND(price)}
          </span>
        )}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
