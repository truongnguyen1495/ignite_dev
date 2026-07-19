"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProductAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditProductForm({
  productId,
  title,
  subtitle,
  description,
  badgeLabel,
  imageUrl,
  order,
  price,
  salePrice,
  cv,
  slug,
  lifestyleImage1Url,
  lifestyleImage2Url,
  lifestyleImage3Url,
}: {
  productId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badgeLabel: string | null;
  imageUrl: string | null;
  order: number;
  price: number;
  salePrice: number | null;
  cv: number;
  slug: string | null;
  lifestyleImage1Url: string | null;
  lifestyleImage2Url: string | null;
  lifestyleImage3Url: string | null;
}) {
  const [error, formAction, pending] = useActionState(updateProductAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <Input id="title" name="title" defaultValue={title} required label="Tên sản phẩm" />
      <Input
        id="subtitle"
        name="subtitle"
        defaultValue={subtitle ?? ""}
        label="Mô tả ngắn (tùy chọn)"
        hint="Hiện dưới tên sản phẩm trên thẻ."
      />
      <Textarea
        id="description"
        name="description"
        rows={3}
        defaultValue={description ?? ""}
        label="Mô tả chi tiết (tùy chọn)"
      />
      <Input id="badgeLabel" name="badgeLabel" defaultValue={badgeLabel ?? ""} label="Nhãn loại (tùy chọn)" hint="Vd: Package." />
      <CoverImageInput
        name="imageUrl"
        alt="Ảnh sản phẩm"
        label="Ảnh sản phẩm"
        defaultValue={imageUrl ?? ""}
        onChange={() => setIsDirty(true)}
      />
      <Input id="order" name="order" type="number" defaultValue={order} label="Thứ tự hiển thị" />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step={1000}
          defaultValue={price}
          label="Giá gốc (VNĐ)"
          hint="0 = chưa niêm yết giá."
        />
        <Input
          id="salePrice"
          name="salePrice"
          type="number"
          min={0}
          step={1000}
          defaultValue={salePrice ?? ""}
          label="Giá khuyến mãi (tùy chọn)"
          hint="Phải nhỏ hơn giá gốc."
        />
      </div>
      <Input id="cv" name="cv" type="number" min={0} defaultValue={cv} label="CV (Commission Volume)" />

      <div className="space-y-4 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Landing page riêng (tùy chọn)</p>
          <p className="mt-1 text-xs text-muted">
            Chỉ điền nếu sản phẩm này có trang giới thiệu riêng được dựng thủ công (vd: SANAREY Aria).
            Để trống với sản phẩm thông thường — trang chi tiết mặc định sẽ được dùng.
          </p>
        </div>
        <Input id="slug" name="slug" defaultValue={slug ?? ""} label="Slug" hint="Vd: sanarey-aria — phải khớp với slug đã lập trình sẵn." />
        <CoverImageInput
          name="lifestyleImage1Url"
          alt="Ảnh đời sống 1"
          label="Ảnh đời sống 1"
          defaultValue={lifestyleImage1Url ?? ""}
          onChange={() => setIsDirty(true)}
          enforceRatio={false}
        />
        <CoverImageInput
          name="lifestyleImage2Url"
          alt="Ảnh đời sống 2"
          label="Ảnh đời sống 2"
          defaultValue={lifestyleImage2Url ?? ""}
          onChange={() => setIsDirty(true)}
          enforceRatio={false}
        />
        <CoverImageInput
          name="lifestyleImage3Url"
          alt="Ảnh đời sống 3"
          label="Ảnh đời sống 3"
          defaultValue={lifestyleImage3Url ?? ""}
          onChange={() => setIsDirty(true)}
          enforceRatio={false}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant={isDirty ? "primary" : "secondary"}
          disabled={pending || !isDirty}
          isLoading={pending}
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
      </div>
    </form>
  );
}
