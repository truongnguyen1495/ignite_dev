"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateVendorProductAction } from "../../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditVendorProductForm({
  productId,
  title,
  subtitle,
  description,
  imageUrl,
  price,
  salePrice,
}: {
  productId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number;
  salePrice: number | null;
}) {
  const [error, formAction, pending] = useActionState(updateVendorProductAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setIsDirty(false);
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <Input id="title" name="title" defaultValue={title} required label="Tên sản phẩm" />
      <Textarea id="subtitle" name="subtitle" defaultValue={subtitle ?? ""} label="Mô tả ngắn (tùy chọn)" />
      <Textarea id="description" name="description" rows={3} defaultValue={description ?? ""} label="Mô tả chi tiết (tùy chọn)" />
      <CoverImageInput
        name="imageUrl"
        alt="Ảnh sản phẩm"
        label="Ảnh sản phẩm"
        defaultValue={imageUrl ?? ""}
        onChange={() => setIsDirty(true)}
        uploadUrl="/api/vendor/upload-image"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input id="price" name="price" type="number" min={0} step={1000} defaultValue={price} label="Giá bán (VNĐ)" />
        <Input
          id="salePrice"
          name="salePrice"
          type="number"
          min={0}
          step={1000}
          defaultValue={salePrice ?? ""}
          label="Giá khuyến mãi (tùy chọn)"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant={isDirty ? "primary" : "secondary"} disabled={pending || !isDirty} isLoading={pending}>
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
      </div>
    </form>
  );
}
