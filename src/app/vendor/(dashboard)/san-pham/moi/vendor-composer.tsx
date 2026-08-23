"use client";

import { useActionState, useState } from "react";
import {
  createVendorProductAction,
  createVendorCourseAction,
  createVendorLibraryItemAction,
} from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "@/app/admin/library/library-file-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type Kind = "PRODUCT" | "COURSE" | "LIBRARY_ITEM";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "PRODUCT", label: "Sản phẩm" },
  { kind: "COURSE", label: "Khoá học" },
  { kind: "LIBRARY_ITEM", label: "Sách" },
];

function PriceFields() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input id="price" name="price" type="number" min={0} step={1000} defaultValue={0} label="Giá bán (VNĐ)" />
      <Input
        id="salePrice"
        name="salePrice"
        type="number"
        min={0}
        step={1000}
        label="Giá khuyến mãi (tùy chọn)"
        hint="Để trống nếu không giảm."
      />
    </div>
  );
}

function ProductForm() {
  const [error, formAction, pending] = useActionState(createVendorProductAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên sản phẩm" placeholder="VD: Đĩa gốm hoa văn sen" />
      <Textarea
        id="subtitle"
        name="subtitle"
        label="Mô tả ngắn (tùy chọn)"
        hint="Hiện dưới tên sản phẩm trên thẻ."
      />
      <Textarea
        id="description"
        name="description"
        rows={3}
        label="Mô tả chi tiết (tùy chọn)"
        placeholder="Đĩa gốm thủ công, đường kính 22cm, men lam vẽ tay hoạ tiết hoa sen..."
      />
      <CoverImageInput name="imageUrl" alt="Ảnh sản phẩm" label="Ảnh sản phẩm" uploadUrl="/api/vendor/upload-image" />
      <PriceFields />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending} className="w-full justify-center">
        {pending ? "Đang đăng..." : "Đăng bán ngay"}
      </Button>
    </form>
  );
}

function CourseForm() {
  const [error, formAction, pending] = useActionState(createVendorCourseAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên khóa học" placeholder="VD: Làm gốm cơ bản tại nhà" />
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput alt="Ảnh bìa khóa học" uploadUrl="/api/vendor/upload-image" />
      <PriceFields />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending} className="w-full justify-center">
        {pending ? "Đang tạo..." : "Tạo khóa học"}
      </Button>
      <p className="text-xs text-muted">Sau khi tạo, bạn sẽ thêm chương &amp; bài giảng ở trang chỉnh sửa khóa học.</p>
    </form>
  );
}

function LibraryForm() {
  const [error, formAction, pending] = useActionState(createVendorLibraryItemAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên sách / tài liệu" placeholder="VD: Sổ tay kỹ thuật vuốt gốm" />
      <Input id="author" name="author" label="Tác giả (tùy chọn)" />
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput alt="Ảnh bìa" uploadUrl="/api/vendor/upload-image" />
      <LibraryFileInput uploadUrl="/api/vendor/upload-library-file" />
      <PriceFields />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending} className="w-full justify-center">
        {pending ? "Đang đăng..." : "Đăng bán ngay"}
      </Button>
    </form>
  );
}

export function VendorComposer() {
  const [kind, setKind] = useState<Kind>("PRODUCT");

  return (
    <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
      <div className="mb-5 flex gap-1 rounded-lg bg-background p-1">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            onClick={() => setKind(tab.kind)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === tab.kind ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {kind === "PRODUCT" && <ProductForm />}
      {kind === "COURSE" && <CourseForm />}
      {kind === "LIBRARY_ITEM" && <LibraryForm />}
    </div>
  );
}
