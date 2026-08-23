"use client";

import { useActionState, useEffect, useRef } from "react";
import { createVendorCourseLessonAction, updateVendorCourseLessonAction } from "../../actions";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

// Plain textarea instead of admin's LessonContentEditor (Tiptap, with image
// uploads wired to /api/admin/upload-image) — forking that editor to accept
// a configurable upload endpoint was cut for time. A vendor's lesson "ghi
// chú" is plain text for now; the video itself is still a full YouTube embed
// either way, which is the part students actually watch.
export function VendorLessonForm({
  courseId,
  lessonId,
  title = "",
  content = "",
  youtubeId = "",
  chapterId = "",
  chapters,
  onSuccess,
  onCancel,
}: {
  courseId: string;
  lessonId?: string;
  title?: string;
  content?: string;
  youtubeId?: string | null;
  chapterId?: string | null;
  chapters: { id: string; title: string }[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const action = lessonId ? updateVendorCourseLessonAction : createVendorCourseLessonAction;
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
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-background p-4">
      <input type="hidden" name="courseId" value={courseId} />
      {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
      <Input id={`title-${lessonId ?? "new"}`} name="title" defaultValue={title} required label="Tiêu đề bài giảng" />
      {chapters.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground">Chương (tùy chọn)</span>
          <select
            name="chapterId"
            defaultValue={chapterId ?? ""}
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Không thuộc chương nào</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <Input
        id={`youtube-${lessonId ?? "new"}`}
        name="youtube"
        defaultValue={youtubeId ?? ""}
        placeholder="https://www.youtube.com/watch?v=..."
        label="Link video YouTube"
      />
      <Textarea id={`content-${lessonId ?? "new"}`} name="content" rows={3} defaultValue={content} label="Ghi chú (tùy chọn)" />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            Hủy
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending} isLoading={pending}>
          {pending ? "Đang lưu..." : "Hoàn tất"}
        </Button>
      </div>
    </form>
  );
}
