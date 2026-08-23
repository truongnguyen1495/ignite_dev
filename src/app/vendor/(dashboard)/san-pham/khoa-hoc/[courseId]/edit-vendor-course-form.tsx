"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVendorCourseAction, toggleVendorCourseVisibilityAction } from "../../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditVendorCourseForm({
  courseId,
  title,
  description,
  coverImageUrl,
  price,
  salePrice,
}: {
  courseId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  price: number;
  salePrice: number | null;
}) {
  const [error, formAction, pending] = useActionState(updateVendorCourseAction, undefined);
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
        <input type="hidden" name="courseId" value={courseId} />
        <Input id="title" name="title" defaultValue={title} required label="Tên khóa học" />
        <Textarea id="description" name="description" rows={3} defaultValue={description ?? ""} label="Mô tả (tùy chọn)" />
        <CoverImageInput
          alt="Ảnh bìa khóa học"
          defaultValue={coverImageUrl ?? ""}
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={togglePending}
        onClick={() =>
          startTransition(async () => {
            await toggleVendorCourseVisibilityAction(courseId);
            router.refresh();
          })
        }
      >
        Ẩn / hiện khóa học này
      </Button>
    </div>
  );
}
