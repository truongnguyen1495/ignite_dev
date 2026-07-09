"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourseLessonAction, updateCourseLessonAction } from "../../actions";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CourseLessonForm({
  courseId,
  lessonId,
  title = "",
  content = "",
  youtubeId = "",
  order = 0,
  onSuccess,
  onCancel,
}: {
  courseId: string;
  lessonId?: string;
  title?: string;
  content?: string;
  youtubeId?: string | null;
  order?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const action = lessonId ? updateCourseLessonAction : createCourseLessonAction;
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      onSuccess?.();
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="courseId" value={courseId} />
      {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Thông tin bài học</h2>
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
        <Input
          id="order"
          name="order"
          type="number"
          defaultValue={order}
          className="max-w-[200px]"
          label="Thứ tự hiển thị"
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Video YouTube</h2>
        <Input
          id="youtube"
          name="youtube"
          defaultValue={youtubeId ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          label="Link video YouTube"
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Ghi chú (tùy chọn)</h2>
        <LessonContentEditor defaultValue={content} />
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-6">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={pending} isLoading={pending}>
          {pending ? "Đang lưu..." : "Hoàn tất"}
        </Button>
      </div>
    </form>
  );
}
