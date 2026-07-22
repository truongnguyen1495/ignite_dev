"use client";

import { useActionState } from "react";
import { updateAnnouncementAction } from "../actions";
import { ORDERED_ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import type { Level, AnnouncementCategory } from "@prisma/client";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { AnnouncementAudienceFields } from "../audience-fields";

export function EditAnnouncementForm({
  announcementId,
  title,
  content,
  coverImageUrl,
  category,
  minLevel,
  visibleToGuest,
  visibleToProspective,
  visibleToLeveled,
}: {
  announcementId: string;
  title: string;
  content: string;
  coverImageUrl: string | null;
  category: AnnouncementCategory;
  minLevel: Level | null;
  visibleToGuest: boolean;
  visibleToProspective: boolean;
  visibleToLeveled: boolean;
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
        <AnnouncementAudienceFields
          defaultVisibleToGuest={visibleToGuest}
          defaultVisibleToProspective={visibleToProspective}
          defaultVisibleToLeveled={visibleToLeveled}
          defaultMinLevel={minLevel}
        />
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
