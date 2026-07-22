"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/dashboard/orders/actions";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/currency";

// Buy flow for a physical Product — separate from BuyButton (Course/
// LibraryItem) because a physical good needs a shipping address collected
// before an order can be created, which a plain yes/no confirm dialog can't
// validate. `className`/`children` let each bespoke landing page (Aria/
// Activa/Simetra/BR-9) render this as its own styled `.btn` element instead
// of a generic-looking button, so the page's visual design stays intact.
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createOrderAction("PRODUCT", productId, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/orders/${result.orderId}`);
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            // This dialog (unlike ConfirmDialog) has 3 input fields, so
            // focusing one opens the on-screen keyboard on mobile — on a
            // short viewport (e.g. a small phone with the keyboard open)
            // the dialog's natural height can exceed what's left, and being
            // `fixed`+centered means any overflow gets clipped top and
            // bottom with no way to scroll it into view. max-h + overflow-y
            // keeps the submit button reachable instead of clipped off.
            className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-border bg-surface p-6 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted">
                {formatVND(price)}
                {originalPrice != null && (
                  <span className="ml-2 text-xs text-muted line-through">{formatVND(originalPrice)}</span>
                )}
              </p>
            </div>
            <div className="space-y-3">
              <Input
                label="Họ tên người nhận"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                disabled={pending}
              />
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
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Để sau
              </Button>
              <Button type="button" variant="primary" onClick={submit} isLoading={pending}>
                Đặt hàng
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
