"use client";

import { useActionState, useState } from "react";
import { createProductAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateProductForm({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [error, formAction, pending] = useActionState(createProductAction, undefined);
  const [slugValue, setSlugValue] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên sản phẩm" />
      <Input id="subtitle" name="subtitle" label="Mô tả ngắn (tùy chọn)" hint="Hiện dưới tên sản phẩm trên thẻ, vd: “Precision Energy Wand”." />
      <Textarea id="description" name="description" rows={3} label="Mô tả chi tiết (tùy chọn)" />
      <Input id="badgeLabel" name="badgeLabel" label="Nhãn loại (tùy chọn)" hint="Vd: Package." />
      <CoverImageInput name="imageUrl" alt="Ảnh sản phẩm" label="Ảnh sản phẩm" />
      <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step={1000}
          defaultValue={0}
          label="Giá gốc (VNĐ)"
          hint="0 = chưa niêm yết giá."
        />
        <Input
          id="salePrice"
          name="salePrice"
          type="number"
          min={0}
          step={1000}
          label="Giá khuyến mãi (tùy chọn)"
          hint="Phải nhỏ hơn giá gốc."
        />
      </div>
      <Input id="cv" name="cv" type="number" min={0} defaultValue={0} label="CV (Commission Volume)" />

      {isSuperAdmin && (
        <div className="space-y-4 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Landing page riêng (tùy chọn)</p>
            <p className="mt-1 text-xs text-muted">
              Chỉ điền nếu sản phẩm này có trang giới thiệu riêng được dựng thủ công (vd: SANAREY Aria, Activa,
              Simetra, BR-9). Để trống với sản phẩm thông thường — trang chi tiết mặc định sẽ được dùng. Ảnh đời
              sống bên dưới chỉ áp dụng cho slug sanarey-aria — các landing page khác dùng ảnh dựng sẵn trong code.
            </p>
          </div>
          <Input
            id="slug"
            name="slug"
            label="Slug"
            hint="Vd: sanarey-aria — phải khớp với slug đã lập trình sẵn."
            onChange={(e) => setSlugValue(e.target.value)}
          />
          {slugValue.trim() === "sanarey-aria" && (
            <>
              <CoverImageInput name="lifestyleImage1Url" alt="Ảnh đời sống 1" label="Ảnh đời sống 1" enforceRatio={false} />
              <CoverImageInput name="lifestyleImage2Url" alt="Ảnh đời sống 2" label="Ảnh đời sống 2" enforceRatio={false} />
              <CoverImageInput name="lifestyleImage3Url" alt="Ảnh đời sống 3" label="Ảnh đời sống 3" enforceRatio={false} />
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang tạo..." : "Tạo sản phẩm"}
      </Button>
    </form>
  );
}
