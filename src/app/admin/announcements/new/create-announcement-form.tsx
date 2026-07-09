"use client";

import { useActionState } from "react";
import { createAnnouncementAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateAnnouncementForm() {
  const [error, formAction, pending] = useActionState(createAnnouncementAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <Input id="title" name="title" required label="Tiêu đề" />
        <Select id="minLevel" name="minLevel" defaultValue="" label="Đối tượng xem" hint="Bỏ trống nếu muốn tất cả học viên đều xem được.">
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
        <LessonContentEditor />
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" disabled={pending} isLoading={pending}>
          {pending ? "Đang đăng..." : "Đăng bản tin"}
        </Button>
      </div>
    </form>
  );
}
