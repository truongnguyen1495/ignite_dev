"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Package } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatVND } from "@/lib/currency";
import { removeFromCartAction, confirmCartOrderAction, type ShippingDetails } from "./actions";

export type CartListItem = {
  id: string;
  kind: OrderItemKind;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  unavailable: boolean;
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

// Shipping is collected once for the whole cart, right before checkout —
// only shown when the cart has at least one PRODUCT item (see CartList).
function ShippingDialog({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (shipping: ShippingDetails) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.");
      return;
    }
    onSubmit({ name: name.trim(), phone: phone.trim(), address: address.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !pending && onClose()}>
      <div
        className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-border bg-surface p-6 text-left shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">Thông tin giao hàng</h2>
        <p className="text-sm text-muted">Giỏ hàng có sản phẩm vật lý — cho biết nơi giao hàng trước khi xác nhận đơn.</p>
        <div className="space-y-3">
          <Input label="Họ tên người nhận" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" disabled={pending} />
          <Input
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            disabled={pending}
          />
          <Textarea
            label="Địa chỉ nhận hàng"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            rows={3}
            disabled={pending}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Để sau
          </Button>
          <Button type="button" variant="primary" onClick={submit} isLoading={pending}>
            Xác nhận đơn hàng
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CartList({ items }: { items: CartListItem[] }) {
  const [viewing, setViewing] = useState<CartListItem | null>(null);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  function remove(id: string) {
    startTransition(async () => {
      await removeFromCartAction(id);
      setViewing(null);
      router.refresh();
    });
  }

  function submitOrder(shipping?: ShippingDetails) {
    setError(undefined);
    startTransition(async () => {
      const result = await confirmCartOrderAction(shipping);
      if (result.error) {
        setError(result.error);
        setShippingOpen(false);
        return;
      }
      router.push(`/dashboard/orders/${result.orderId}`);
    });
  }

  const hasProduct = items.some((i) => i.kind === "PRODUCT");
  const total = items.reduce((sum, i) => sum + i.price, 0);

  async function startCheckout() {
    if (hasProduct) {
      setShippingOpen(true);
      return;
    }
    const ok = await confirm({
      title: "Xác nhận đơn hàng",
      tone: "primary",
      confirmLabel: "Xác nhận đơn hàng",
      description: `Tổng cộng ${formatVND(total)} cho ${items.length} sản phẩm.`,
    });
    if (!ok) return;
    submitOrder();
  }

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
            <span className="shrink-0 text-sm text-muted">{formatVND(item.price)}</span>
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" className="w-full" onClick={startCheckout} disabled={pending} isLoading={pending}>
        Xác nhận đơn hàng
      </Button>

      {viewing && (
        <ItemDetailDialog
          item={viewing}
          pending={pending}
          onClose={() => setViewing(null)}
          onRemove={() => remove(viewing.id)}
        />
      )}
      {shippingOpen && (
        <ShippingDialog
          pending={pending}
          onClose={() => setShippingOpen(false)}
          onSubmit={(shipping) => submitOrder(shipping)}
        />
      )}
    </div>
  );
}
