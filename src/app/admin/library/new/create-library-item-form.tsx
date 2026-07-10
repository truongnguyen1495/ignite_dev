"use client";

import { useActionState, useState } from "react";
import { createLibraryItemAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "../library-file-input";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateLibraryItemForm() {
  const [error, formAction, pending] = useActionState(createLibraryItemAction, undefined);
  const [visibleToGuest, setVisibleToGuest] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tiêu đề" />
      <Input id="author" name="author" label="Tác giả (tùy chọn)" />
      <Select id="type" name="type" defaultValue="BOOK" required label="Loại">
        <option value="BOOK">Sách</option>
        <option value="DOCUMENT">Tài liệu</option>
      </Select>
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput alt="Ảnh bìa sách/tài liệu" />
      <LibraryFileInput onChange={({ pageCount }) => setPageCount(pageCount)} />
      <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />

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
          max={pageCount ?? undefined}
          defaultValue={5}
          label="Số trang cho khách đọc thử"
          hint={pageCount ? `File có ${pageCount} trang.` : "Tải file PDF lên trước để biết tổng số trang."}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang tạo..." : "Tạo mục thư viện"}
      </Button>
    </form>
  );
}
