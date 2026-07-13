"use client";

import { useActionState } from "react";
import { createCourseAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateCourseForm({ salesEnabled }: { salesEnabled: boolean }) {
  const [error, formAction, pending] = useActionState(createCourseAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên khóa học" />
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput alt="Ảnh bìa khóa học" />
      <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />
      {salesEnabled && (
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step={1000}
          defaultValue={0}
          label="Giá bán (VNĐ)"
          hint="0 = không bán, chỉ cấp quyền thủ công như trước giờ."
        />
      )}
      <div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="hiddenFromGuest" className="h-4 w-4 accent-primary" />
          Không công khai cho khách (ẩn hoàn toàn khỏi trang khách)
        </label>
        <p className="mt-1 text-xs text-muted">
          Chọn bài học nào cho khách học thử sau khi tạo khóa học, ở phần &quot;Cấp quyền học thử cho
          khách&quot; trên trang chỉnh sửa.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="featuredOnHome" className="h-4 w-4 accent-primary" />
        Hiện trong mục &quot;Khóa học nổi bật&quot; ở trang chủ khách
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang tạo..." : "Tạo khóa học"}
      </Button>
    </form>
  );
}
