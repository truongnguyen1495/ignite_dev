"use client";

import { useActionState } from "react";
import { updateLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "../lesson-content-editor";
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
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="lessonId" value={lessonId} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Thông tin bài học</h2>
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
            Tiêu đề
          </label>
          <input
            id="title"
            name="title"
            defaultValue={title}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="level" className="mb-1.5 block text-sm font-medium text-foreground">
              Cấp
            </label>
            <select
              id="level"
              name="level"
              defaultValue={level}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {ORDERED_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
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
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Video YouTube</h2>
        <div>
          <label htmlFor="youtube" className="mb-1.5 block text-sm font-medium text-foreground">
            Link video YouTube (tùy chọn)
          </label>
          <input
            id="youtube"
            name="youtube"
            defaultValue={youtubeId ?? ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Nội dung bài học</h2>
        <LessonContentEditor defaultValue={content} />
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
