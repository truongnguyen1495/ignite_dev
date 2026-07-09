"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateCourseAction } from "../actions";
import { CoverImageInput } from "../cover-image-input";
import { BackLink } from "@/components/ui/back-link";

export function EditCourseForm({
  courseId,
  title,
  description,
  coverImageUrl,
  order,
}: {
  courseId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  order: number;
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
        <button
          type="submit"
          form="edit-course-form"
          disabled={pending || !isDirty}
          className={
            pending || !isDirty
              ? "rounded-lg bg-border px-4 py-2 text-sm font-medium text-muted"
              : "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          }
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8">
        <form
          id="edit-course-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
              Tên khóa học
            </label>
            <input
              id="title"
              name="title"
              defaultValue={title}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
              Mô tả (tùy chọn)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={description ?? ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <CoverImageInput defaultValue={coverImageUrl ?? ""} onChange={() => setIsDirty(true)} />
          <div>
            <label htmlFor="order" className="mb-1.5 block text-sm font-medium text-foreground">
              Thứ tự hiển thị
            </label>
            <input
              id="order"
              name="order"
              type="number"
              defaultValue={order}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </div>
    </>
  );
}
