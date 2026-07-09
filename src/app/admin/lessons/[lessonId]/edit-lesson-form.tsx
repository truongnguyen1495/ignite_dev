"use client";

import { useActionState } from "react";
import { updateLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "../lesson-content-editor";
import type { Level } from "@prisma/client";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="level" name="level" defaultValue={level} label="Cấp">
            {ORDERED_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
          <Input id="order" name="order" type="number" defaultValue={order} label="Thứ tự hiển thị" />
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Video YouTube</h2>
        <Input
          id="youtube"
          name="youtube"
          defaultValue={youtubeId ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          label="Link video YouTube (tùy chọn)"
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Nội dung bài học</h2>
        <LessonContentEditor defaultValue={content} />
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" disabled={pending} isLoading={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
