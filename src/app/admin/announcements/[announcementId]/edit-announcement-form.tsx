"use client";

import { useActionState } from "react";
import { updateAnnouncementAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import type { Level } from "@prisma/client";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditAnnouncementForm({
  announcementId,
  title,
  content,
  minLevel,
}: {
  announcementId: string;
  title: string;
  content: string;
  minLevel: Level | null;
}) {
  const [error, formAction, pending] = useActionState(updateAnnouncementAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="announcementId" value={announcementId} />

      <section className="space-y-4">
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
        <Select
          id="minLevel"
          name="minLevel"
          defaultValue={minLevel ?? ""}
          label="Đối tượng xem"
          hint="Bỏ trống nếu muốn tất cả học viên đều xem được."
        >
          <option value="">Tất cả học viên</option>
          {ORDERED_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]} trở lên
            </option>
          ))}
        </Select>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Nội dung</h2>
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
