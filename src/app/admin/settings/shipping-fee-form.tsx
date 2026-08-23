"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setShippingSettingsAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function ShippingFeeForm({
  shippingFee,
  freeShippingFromItems,
}: {
  shippingFee: number;
  freeShippingFromItems: number;
}) {
  const [error, formAction, pending] = useActionState(setShippingSettingsAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  // Without this the button went straight back to reading "Lưu" the instant
  // the save finished, which is pixel-for-pixel what it looked like before
  // the click — an admin had no way to tell a successful save from a click
  // that never registered. Clearing the flag only when the action settled
  // WITHOUT an error is the part that matters: saying "Đã lưu" over a failed
  // save would be worse than saying nothing at all.
  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Phí vận chuyển</p>
        <p className="text-sm text-muted">
          Chỉ áp dụng cho đơn có sản phẩm vật lý — đơn chỉ có khóa học hoặc sách số không bị tính phí.
          Mức phí được chốt vào đơn lúc đặt hàng, nên sửa ở đây không làm thay đổi các đơn đã tạo.
        </p>
      </div>

      <Input
        id="shippingFee"
        name="shippingFee"
        type="number"
        min={0}
        step={1000}
        defaultValue={shippingFee}
        className="max-w-[180px]"
        label="Phí vận chuyển (đồng)"
        hint="Đặt 0 nếu luôn miễn phí giao hàng."
      />

      <Input
        id="freeShippingFromItems"
        name="freeShippingFromItems"
        type="number"
        min={0}
        max={999}
        defaultValue={freeShippingFromItems}
        className="max-w-[180px]"
        label="Miễn phí ship từ (sản phẩm)"
        hint="Đếm theo số lượng sản phẩm vật lý trong đơn. Đặt 0 để tắt ưu đãi này."
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        size="sm"
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu" : "Đã lưu"}
      </Button>
    </form>
  );
}
