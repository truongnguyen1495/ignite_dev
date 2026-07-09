"use client";

import { useActionState } from "react";
import { createCourseAction } from "../actions";
import { CoverImageInput } from "../cover-image-input";

export function CreateCourseForm() {
  const [error, formAction, pending] = useActionState(createCourseAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
          Tên khóa học
        </label>
        <input
          id="title"
          name="title"
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
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <CoverImageInput />
      <div>
        <label htmlFor="order" className="mb-1.5 block text-sm font-medium text-foreground">
          Thứ tự hiển thị
        </label>
        <input
          id="order"
          name="order"
          type="number"
          defaultValue={0}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang tạo..." : "Tạo khóa học"}
      </button>
    </form>
  );
}
