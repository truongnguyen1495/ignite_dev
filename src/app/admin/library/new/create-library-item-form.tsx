"use client";

import { useActionState, useState } from "react";
import { createLibraryItemAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { LibraryFileInput } from "../library-file-input";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateLibraryItemForm({
  salesEnabled,
  canManageOrders,
}: {
  salesEnabled: boolean;
  canManageOrders: boolean;
}) {
  const [error, formAction, pending] = useActionState(createLibraryItemAction, undefined);
  const [isFree, setIsFree] = useState(false);
  const [visibleToGuest, setVisibleToGuest] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [format, setFormat] = useState<"PDF" | "INTERACTIVE">("PDF");
  const [coverUploading, setCoverUploading] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tiêu đề" />
      <Input id="author" name="author" label="Tác giả (tùy chọn)" />
      <Select id="type" name="type" defaultValue="BOOK" required label="Loại">
        <option value="BOOK">Sách</option>
        <option value="DOCUMENT">Tài liệu</option>
      </Select>
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput alt="Ảnh bìa sách/tài liệu" onUploadingChange={setCoverUploading} />
      <CoverImageInput
        name="backgroundImageUrl"
        label="Ảnh nền phía sau sách (tùy chọn)"
        alt="Ảnh nền"
        enforceRatio={false}
        onUploadingChange={setBackgroundUploading}
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Nguồn nội dung</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
            <input
              type="radio"
              name="format"
              value="PDF"
              checked={format === "PDF"}
              onChange={() => setFormat("PDF")}
              className="mt-0.5 accent-primary"
            />
            <span>
              <span className="block font-medium text-foreground">Tải file PDF lên</span>
              <span className="block text-xs text-muted">Đọc bằng trình xem PDF/flipbook như hiện tại.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
            <input
              type="radio"
              name="format"
              value="INTERACTIVE"
              checked={format === "INTERACTIVE"}
              onChange={() => setFormat("INTERACTIVE")}
              className="mt-0.5 accent-primary"
            />
            <span>
              <span className="block font-medium text-foreground">Soạn bằng trình soạn thảo</span>
              <span className="block text-xs text-muted">
                Tạo trang với ảnh/chữ/video/audio ngay trong hệ thống — mở trình soạn thảo sau khi tạo.
              </span>
            </span>
          </label>
        </div>
      </div>

      {format === "PDF" ? (
        <LibraryFileInput onChange={({ pageCount }) => setPageCount(pageCount)} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="bookWidth"
            name="bookWidth"
            type="number"
            min={200}
            defaultValue={800}
            label="Chiều rộng trang (px)"
          />
          <Input
            id="bookHeight"
            name="bookHeight"
            type="number"
            min={200}
            defaultValue={1131}
            label="Chiều cao trang (px)"
          />
        </div>
      )}

      <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />

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
        {/* Giá gốc/giá khuyến mãi là chuyện tiền bạc, riêng với quyền quản lý
            thư viện — chỉ admin có quyền "Đơn hàng" mới thấy/sửa được, dù
            Miễn phí ở trên đã mở cho mọi admin quản lý thư viện. */}
        {canManageOrders && !isFree && salesEnabled && (
          <>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step={1000}
              defaultValue={0}
              label="Giá gốc (VNĐ)"
              hint="0 = không bán, chỉ cấp quyền thủ công như trước giờ."
            />
            <Input
              id="salePrice"
              name="salePrice"
              type="number"
              min={0}
              step={1000}
              label="Giá khuyến mãi (VNĐ, tùy chọn)"
              hint="Để trống nếu không giảm giá. Phải nhỏ hơn giá gốc."
            />
          </>
        )}
      </div>

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
          max={format === "PDF" ? (pageCount ?? undefined) : undefined}
          defaultValue={5}
          label="Số trang cho khách đọc thử"
          hint={
            format === "PDF"
              ? pageCount
                ? `File có ${pageCount} trang.`
                : "Tải file PDF lên trước để biết tổng số trang."
              : "Soạn xong trang trong trình soạn thảo rồi chỉnh lại số này nếu cần."
          }
        />
      )}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="featuredOnHome" className="h-4 w-4 accent-primary" />
        Hiện trong mục &quot;Ebook nổi bật&quot; ở trang chủ khách
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={pending || coverUploading || backgroundUploading} isLoading={pending}>
        {pending
          ? "Đang tạo..."
          : coverUploading || backgroundUploading
            ? "Đang tải ảnh..."
            : format === "INTERACTIVE"
              ? "Tạo và mở trình soạn thảo"
              : "Tạo mục thư viện"}
      </Button>
    </form>
  );
}
