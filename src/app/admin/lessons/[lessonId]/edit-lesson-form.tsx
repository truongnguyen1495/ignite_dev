"use client";

import { useActionState } from "react";
import { updateLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

export function EditLessonForm({
  lessonId,
  title,
  level,
  content,
  youtubeId,
  order,
}: {
  lessonId: string;
  title: string;
  level: Level;
  content: string;
  youtubeId: string | null;
  order: number;
}) {
  const [error, formAction, pending] = useActionState(updateLessonAction, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Tiêu đề
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="level" className="block text-sm font-medium mb-1">
          Cấp
        </label>
        <select
          id="level"
          name="level"
          defaultValue={level}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {ORDERED_LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="youtube" className="block text-sm font-medium mb-1">
          Link video YouTube (tùy chọn)
        </label>
        <input
          id="youtube"
          name="youtube"
          defaultValue={youtubeId ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1">
          Nội dung bài học (hỗ trợ Markdown)
        </label>
        <textarea
          id="content"
          name="content"
          defaultValue={content}
          required
          rows={10}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="order" className="block text-sm font-medium mb-1">
          Thứ tự hiển thị
        </label>
        <input
          id="order"
          name="order"
          type="number"
          defaultValue={order}
          className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
