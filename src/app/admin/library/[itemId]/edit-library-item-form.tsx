"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { PenTool } from "lucide-react";
import { updateLibraryItemAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "../library-file-input";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import type { LibraryItemType, LibraryItemFormat } from "@prisma/client";

export function EditLibraryItemForm({
  libraryItemId,
  title,
  author,
  description,
  type,
  format,
  coverImageUrl,
  backgroundImageUrl,
  filePath,
  pageCount,
  price,
  salePrice,
  isFree: initialIsFree,
  salesEnabled,
  canManageOrders,
}: {
  libraryItemId: string;
  title: string;
  author: string | null;
  description: string | null;
  type: LibraryItemType;
  format: LibraryItemFormat;
  coverImageUrl: string | null;
  backgroundImageUrl: string | null;
  filePath: string | null;
  pageCount: number | null;
  price: number;
  salePrice: number | null;
  isFree: boolean;
  salesEnabled: boolean;
  canManageOrders: boolean;
}) {
  const [error, formAction, pending] = useActionState(updateLibraryItemAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [isFree, setIsFree] = useState(initialIsFree);
  const [coverUploading, setCoverUploading] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <>
      <div className="sticky top-0 z-20 mb-6 border-b border-border bg-background py-3">
        <BackLink href="/admin/library">Quay lại</BackLink>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
      </div>

      <Card padding="lg">
        <form
          id="edit-library-item-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="libraryItemId" value={libraryItemId} />
          <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
          <Input id="author" name="author" defaultValue={author ?? ""} label="Tác giả (tùy chọn)" />
          <Select id="type" name="type" defaultValue={type} required label="Loại">
            <option value="BOOK">Sách</option>
            <option value="DOCUMENT">Tài liệu</option>
          </Select>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={description ?? ""}
            label="Mô tả (tùy chọn)"
          />
          <CoverImageInput
            alt="Ảnh bìa sách/tài liệu"
            defaultValue={coverImageUrl ?? ""}
            onChange={() => setIsDirty(true)}
            onUploadingChange={setCoverUploading}
          />
          <CoverImageInput
            name="backgroundImageUrl"
            label="Ảnh nền phía sau sách (tùy chọn)"
            alt="Ảnh nền"
            enforceRatio={false}
            defaultValue={backgroundImageUrl ?? ""}
            onChange={() => setIsDirty(true)}
            onUploadingChange={setBackgroundUploading}
          />
          {format === "PDF" ? (
            <LibraryFileInput
              defaultPath={filePath ?? ""}
              defaultPageCount={pageCount}
              onChange={() => setIsDirty(true)}
            />
          ) : (
            <Link
              href={`/admin/library/${libraryItemId}/editor`}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <PenTool className="h-4 w-4" />
              Mở trình soạn thảo ({pageCount ?? 0} trang)
            </Link>
          )}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="isFree"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Miễn phí (cấp quyền xem đầy đủ cho toàn bộ học viên &amp; học sinh, không cần mua)
            </label>

            {isFree && (
              <p className="text-xs text-muted">
                Đang miễn phí — mọi học viên &amp; học sinh tự động có toàn quyền xem, các phần cấp quyền
                riêng bên dưới sẽ tạm ẩn.
              </p>
            )}

            {/* Giá gốc/giá khuyến mãi là chuyện tiền bạc, riêng với quyền quản lý
                thư viện — chỉ admin có quyền "Đơn hàng" mới thấy/sửa được, dù
                Miễn phí ở trên đã mở cho mọi admin quản lý thư viện. */}
            {canManageOrders &&
              (!isFree && salesEnabled ? (
                <>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={price}
                    label="Giá gốc (VNĐ)"
                    hint="0 = không bán, chỉ cấp quyền thủ công như trước giờ."
                  />
                  <Input
                    id="salePrice"
                    name="salePrice"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={salePrice ?? ""}
                    label="Giá khuyến mãi (VNĐ, tùy chọn)"
                    hint="Để trống nếu không giảm giá. Phải nhỏ hơn giá gốc."
                  />
                </>
              ) : (
                // Miễn phí đang bật, hoặc tính năng bán hàng đang tắt — ẩn ô
                // nhập giá nhưng vẫn gửi kèm giá trị hiện tại để lưu không vô
                // tình reset giá về 0.
                <>
                  <input type="hidden" name="price" defaultValue={price} />
                  <input type="hidden" name="salePrice" defaultValue={salePrice ?? ""} />
                </>
              ))}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant={isDirty ? "primary" : "secondary"}
              disabled={pending || !isDirty || coverUploading || backgroundUploading}
              isLoading={pending}
            >
              {pending
                ? "Đang lưu..."
                : coverUploading || backgroundUploading
                  ? "Đang tải ảnh..."
                  : isDirty
                    ? "Lưu thay đổi"
                    : "Đã lưu"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
