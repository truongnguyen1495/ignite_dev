"use client";

import { useActionState } from "react";
import { createLessonAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "../lesson-content-editor";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateLessonForm() {
  const [error, formAction, pending] = useActionState(createLessonAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Thông tin bài học</h2>
        <Input id="title" name="title" required label="Tiêu đề" />
        <Textarea
          id="description"
          name="description"
          rows={2}
          label="Mô tả (tùy chọn)"
          hint="Giới thiệu ngắn hiển thị cho học viên phía trên nội dung bài học."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="level" name="level" defaultValue={ORDERED_LEVELS[0]} label="Cấp">
            {ORDERED_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
          <Input id="order" name="order" type="number" defaultValue={0} label="Thứ tự hiển thị" />
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Video YouTube</h2>
        <Input
          id="youtube"
          name="youtube"
          placeholder="https://www.youtube.com/watch?v=..."
          label="Link video YouTube (tùy chọn)"
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Nội dung bài học</h2>
        <LessonContentEditor />
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" disabled={pending} isLoading={pending}>
          {pending ? "Đang tạo..." : "Tạo bài học"}
        </Button>
      </div>
    </form>
  );
}
