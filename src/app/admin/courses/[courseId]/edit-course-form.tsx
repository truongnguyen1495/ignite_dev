"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateCourseAction } from "../actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";

export function EditCourseForm({
  courseId,
  title,
  description,
  coverImageUrl,
  order,
  price,
  visibleToGuest,
  featuredOnHome,
}: {
  courseId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  order: number;
  price: number;
  visibleToGuest: boolean;
  featuredOnHome: boolean;
}) {
  const [error, formAction, pending] = useActionState(updateCourseAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
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
          <BackLink href="/admin/courses">Quay lại</BackLink>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        <Button
          type="submit"
          form="edit-course-form"
          variant={isDirty ? "primary" : "secondary"}
          disabled={pending || !isDirty}
          isLoading={pending}
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
      </div>

      <Card padding="lg">
        <form
          id="edit-course-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          <Input id="title" name="title" defaultValue={title} required label="Tên khóa học" />
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={description ?? ""}
            label="Mô tả (tùy chọn)"
          />
          <CoverImageInput
            alt="Ảnh bìa khóa học"
            defaultValue={coverImageUrl ?? ""}
            onChange={() => setIsDirty(true)}
          />
          <Input id="order" name="order" type="number" defaultValue={order} label="Thứ tự hiển thị" />
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step={1000}
            defaultValue={price}
            label="Giá bán (VNĐ)"
            hint="0 = không bán, chỉ cấp quyền thủ công như trước giờ."
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="visibleToGuest"
              defaultChecked={visibleToGuest}
              className="h-4 w-4 accent-primary"
            />
            Hiển thị công khai cho khách (không cần đăng nhập)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="featuredOnHome"
              defaultChecked={featuredOnHome}
              className="h-4 w-4 accent-primary"
            />
            Hiện trong mục &quot;Khóa học nổi bật&quot; ở trang chủ khách
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Card>
    </>
  );
}
