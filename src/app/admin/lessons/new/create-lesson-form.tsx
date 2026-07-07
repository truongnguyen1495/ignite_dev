"use client";

import { useActionState } from "react";
import { createLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";

export function CreateLessonForm() {
  const [error, formAction, pending] = useActionState(createLessonAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
          Tiêu đề
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="level" className="mb-1.5 block text-sm font-medium text-foreground">
          Cấp
        </label>
        <select
          id="level"
          name="level"
          defaultValue={ORDERED_LEVELS[0]}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {ORDERED_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="youtube" className="mb-1.5 block text-sm font-medium text-foreground">
          Link video YouTube (tùy chọn)
        </label>
        <input
          id="youtube"
          name="youtube"
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-foreground">
          Nội dung bài học (hỗ trợ Markdown)
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={10}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="order" className="mb-1.5 block text-sm font-medium text-foreground">
          Thứ tự hiển thị
        </label>
        <input
          id="order"
          name="order"
          type="number"
          defaultValue={0}
          className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang tạo..." : "Tạo bài học"}
      </button>
    </form>
  );
}
