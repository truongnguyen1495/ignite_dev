"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateLibraryItemAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "../library-file-input";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import type { LibraryItemType } from "@prisma/client";

export function EditLibraryItemForm({
  libraryItemId,
  title,
  author,
  description,
  type,
  coverImageUrl,
  filePath,
  pageCount,
  guestPreviewPages,
  order,
  visibleToGuest: initialVisibleToGuest,
  featuredOnHome,
}: {
  libraryItemId: string;
  title: string;
  author: string | null;
  description: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  filePath: string;
  pageCount: number | null;
  guestPreviewPages: number | null;
  order: number;
  visibleToGuest: boolean;
  featuredOnHome: boolean;
}) {
  const [error, formAction, pending] = useActionState(updateLibraryItemAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [visibleToGuest, setVisibleToGuest] = useState(initialVisibleToGuest);
  const [currentPageCount, setCurrentPageCount] = useState<number | null>(pageCount);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <>
      <div className="sticky top-0 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background py-3">
        <div>
          <BackLink href="/admin/library">Quay lại</BackLink>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        <Button
          type="submit"
          form="edit-library-item-form"
          variant={isDirty ? "primary" : "secondary"}
          disabled={pending || !isDirty}
          isLoading={pending}
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
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
          />
          <LibraryFileInput
            defaultPath={filePath}
            defaultPageCount={pageCount}
            onChange={({ pageCount }) => {
              setCurrentPageCount(pageCount);
              setIsDirty(true);
            }}
          />
          <Input id="order" name="order" type="number" defaultValue={order} label="Thứ tự hiển thị" />

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="visibleToGuest"
              checked={visibleToGuest}
              onChange={(e) => setVisibleToGuest(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Hiển thị công khai cho khách (chỉ đọc thử một phần)
          </label>

          {visibleToGuest && (
            <Input
              id="guestPreviewPages"
              name="guestPreviewPages"
              type="number"
              min={1}
              max={currentPageCount ?? undefined}
              defaultValue={guestPreviewPages ?? 5}
              label="Số trang cho khách đọc thử"
              hint={
                currentPageCount
                  ? `File có ${currentPageCount} trang.`
                  : "Tải file PDF lên trước để biết tổng số trang."
              }
            />
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="featuredOnHome"
              defaultChecked={featuredOnHome}
              className="h-4 w-4 accent-primary"
            />
            Hiện trong mục &quot;Ebook nổi bật&quot; ở trang chủ khách
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Card>
    </>
  );
}
