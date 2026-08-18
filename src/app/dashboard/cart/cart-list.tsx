"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Package } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/currency";
import { MAX_CART_QUANTITY } from "@/lib/orders";
import { removeFromCartAction, setCartQuantityAction } from "./actions";

export type CartListItem = {
  id: string;
  kind: OrderItemKind;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  unavailable: boolean;
  // Above 1 only for a PRODUCT line — see CartItem.quantity in
  // schema.prisma. The stepper below is hidden for every other kind rather
  // than rendered disabled, because "buy two of this course" isn't a thing
  // the buyer should have to reason about.
  quantity: number;
};

function Thumbnail({ imageUrl, title, className }: { imageUrl: string | null; title: string; className: string }) {
  if (imageUrl) {
    return <Image src={imageUrl} alt={title} fill sizes="112px" className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-surface-hover`}>
      <Package className="h-5 w-5 text-muted" />
    </div>
  );
}

// Opened by tapping an item row — a read-only recap of what's already in the
// cart (image, description, price), not a re-confirmation to add it again.
// Still offers "Xóa khỏi giỏ" here so the student can drop it right from the
// detail view instead of having to close it first.
function ItemDetailDialog({
  item,
  onClose,
  onRemove,
  pending,
}: {
  item: CartListItem;
  onClose: () => void;
  onRemove: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 text-left shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-hover">
          <Thumbnail imageUrl={item.imageUrl} title={item.title} className="absolute inset-0 h-full w-full" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
          {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="font-semibold text-foreground">{formatVND(item.price)}</span>
          {item.originalPrice != null && (
            <span className="text-muted line-through">{formatVND(item.originalPrice)}</span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="danger" onClick={onRemove} disabled={pending}>
            Xóa khỏi giỏ
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

// The cart is now only a cart. Choosing an address and a payment method
// happens on /dashboard/thanh-toan, which is also where the "mua ngay" and
// post-login paths land — one checkout screen, three ways in, instead of a
// shipping form bolted onto this list.
export function CartList({ items }: { items: CartListItem[] }) {
  const [viewing, setViewing] = useState<CartListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove(id: string) {
    startTransition(async () => {
      await removeFromCartAction(id);
      setViewing(null);
      router.refresh();
    });
  }

  // Bounds-checked here as well as on the server: the buttons are already
  // disabled at the edges, so a click that would step past them is a
  // no-op rather than a wasted round trip.
  function changeQuantity(item: CartListItem, delta: number) {
    const next = item.quantity + delta;
    if (next < 1 || next > MAX_CART_QUANTITY) return;
    startTransition(async () => {
      await setCartQuantityAction(item.id, next);
      router.refresh();
    });
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return <p className="text-sm text-muted">Giỏ hàng của bạn đang trống.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => setViewing(item)}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <Thumbnail imageUrl={item.imageUrl} title={item.title} className="absolute inset-0 h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.title}</p>
                {item.description && <p className="line-clamp-1 text-xs text-muted">{item.description}</p>}
                {item.unavailable && (
                  <p className="text-xs text-danger">Không còn hợp lệ — sẽ tự loại khỏi giỏ khi xác nhận.</p>
                )}
              </div>
            </button>
            {item.kind === "PRODUCT" ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => changeQuantity(item, -1)}
                  disabled={pending || item.quantity <= 1}
                  aria-label="Giảm số lượng"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => changeQuantity(item, 1)}
                  disabled={pending || item.quantity >= MAX_CART_QUANTITY}
                  aria-label="Tăng số lượng"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                >
                  +
                </button>
              </span>
            ) : null}
            <span className="shrink-0 text-right text-sm text-muted">
              {formatVND(item.price * item.quantity)}
              {item.quantity > 1 && (
                <span className="block text-xs text-faint">{item.quantity} × {formatVND(item.price)}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={pending}
              aria-label="Xóa khỏi giỏ"
              className="shrink-0 text-muted transition-colors hover:text-danger disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
        <span className="text-foreground">Tổng cộng</span>
        <span className="text-foreground">{formatVND(total)}</span>
      </div>
      <Link
        href="/dashboard/thanh-toan"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Thanh toán
      </Link>

      {viewing && (
        <ItemDetailDialog
          item={viewing}
          pending={pending}
          onClose={() => setViewing(null)}
          onRemove={() => remove(viewing.id)}
        />
      )}
    </div>
  );
}
