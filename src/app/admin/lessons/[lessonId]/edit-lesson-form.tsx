"use client";

import { useActionState } from "react";
import { updateLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "../lesson-content-editor";
import type { Level } from "@prisma/client";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditLessonForm({
  lessonId,
  title,
  level,
  description,
  content,
  youtubeId,
}: {
  lessonId: string;
  title: string;
  level: Level;
  description: string | null;
  content: string;
  youtubeId: string | null;
}) {
  const [error, formAction, pending] = useActionState(updateLessonAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="lessonId" value={lessonId} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Thông tin bài học</h2>
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={description ?? ""}
          label="Mô tả (tùy chọn)"
          hint="Giới thiệu ngắn hiển thị cho học viên phía trên nội dung bài học."
        />
        <Select id="level" name="level" defaultValue={level} label="Cấp">
          {ORDERED_LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </Select>
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
