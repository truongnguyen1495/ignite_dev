"use client";

import { useActionState } from "react";
import { createCourseAction } from "../actions";
import { CoverImageInput } from "../cover-image-input";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateCourseForm() {
  const [error, formAction, pending] = useActionState(createCourseAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Input id="title" name="title" required label="Tên khóa học" />
      <Textarea id="description" name="description" rows={3} label="Mô tả (tùy chọn)" />
      <CoverImageInput />
      <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang tạo..." : "Tạo khóa học"}
      </Button>
    </form>
  );
}
