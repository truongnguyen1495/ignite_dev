"use client";

import { useActionState } from "react";
import { createAnnouncementAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CoverImageInput } from "@/components/ui/cover-image-input";

export function CreateAnnouncementForm() {
  const [error, formAction, pending] = useActionState(createAnnouncementAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <Input id="title" name="title" required label="Tiêu đề" />
        <CoverImageInput alt="Ảnh bìa bản tin" />
        <Select id="category" name="category" defaultValue={ORDERED_ANNOUNCEMENT_CATEGORIES[0]} required label="Chuyên mục" hint="Chọn tab sẽ hiển thị bản tin này cho học viên.">
          {ORDERED_ANNOUNCEMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ANNOUNCEMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
        <Select id="minLevel" name="minLevel" defaultValue="" label="Đối tượng xem" hint="Bỏ trống nếu muốn tất cả học viên đều xem được.">
          <option value="">Tất cả học viên</option>
          {ORDERED_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]} trở lên
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="openToProspectiveStudents" className="h-4 w-4 accent-primary" />
          Cho học sinh (chưa xếp cấp) xem được, dù không đạt cấp yêu cầu ở trên
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="visibleToGuest" className="h-4 w-4 accent-primary" />
          Hiển thị công khai cho khách (không cần đăng nhập)
        </label>
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
