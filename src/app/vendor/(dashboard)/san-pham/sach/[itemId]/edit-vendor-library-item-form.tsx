"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVendorLibraryItemAction, toggleVendorLibraryItemVisibilityAction } from "../../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "@/app/admin/library/library-file-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditVendorLibraryItemForm({
  libraryItemId,
  title,
  author,
  description,
  coverImageUrl,
  filePath,
  pageCount,
  price,
  salePrice,
}: {
  libraryItemId: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImageUrl: string | null;
  filePath: string | null;
  pageCount: number | null;
  price: number;
  salePrice: number | null;
}) {
  const [error, formAction, pending] = useActionState(updateVendorLibraryItemAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [togglePending, startTransition] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setIsDirty(false);
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <div className="space-y-4">
      <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
        <input type="hidden" name="libraryItemId" value={libraryItemId} />
        <Input id="title" name="title" defaultValue={title} required label="Tên sách / tài liệu" />
        <Input id="author" name="author" defaultValue={author ?? ""} label="Tác giả (tùy chọn)" />
        <Textarea id="description" name="description" rows={3} defaultValue={description ?? ""} label="Mô tả (tùy chọn)" />
        <CoverImageInput
          alt="Ảnh bìa"
          defaultValue={coverImageUrl ?? ""}
          onChange={() => setIsDirty(true)}
          uploadUrl="/api/vendor/upload-image"
        />
        <LibraryFileInput
          defaultPath={filePath ?? ""}
          defaultPageCount={pageCount}
          onChange={() => setIsDirty(true)}
          uploadUrl="/api/vendor/upload-library-file"
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={togglePending}
        onClick={() =>
          startTransition(async () => {
            await toggleVendorLibraryItemVisibilityAction(libraryItemId);
            router.refresh();
          })
        }
      >
        Ẩn / hiện mục này
      </Button>
    </div>
  );
}
