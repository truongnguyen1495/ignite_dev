"use client";

import { useActionState } from "react";
import { updateAnnouncementAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import type { Level, AnnouncementCategory } from "@prisma/client";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CoverImageInput } from "@/components/ui/cover-image-input";

export function EditAnnouncementForm({
  announcementId,
  title,
  content,
  coverImageUrl,
  category,
  minLevel,
  visibleToGuest,
}: {
  announcementId: string;
  title: string;
  content: string;
  coverImageUrl: string | null;
  category: AnnouncementCategory;
  minLevel: Level | null;
  visibleToGuest: boolean;
}) {
  const [error, formAction, pending] = useActionState(updateAnnouncementAction, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="announcementId" value={announcementId} />

      <section className="space-y-4">
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề" />
        <CoverImageInput alt="Ảnh bìa bản tin" defaultValue={coverImageUrl ?? ""} />
        <Select id="category" name="category" defaultValue={category} required label="Chuyên mục" hint="Chọn tab sẽ hiển thị bản tin này cho học viên.">
          {ORDERED_ANNOUNCEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ANNOUNCEMENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
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
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="visibleToGuest"
            defaultChecked={visibleToGuest}
            className="h-4 w-4 accent-primary"
          />
          Hiển thị công khai cho khách (không cần đăng nhập)
        </label>
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
