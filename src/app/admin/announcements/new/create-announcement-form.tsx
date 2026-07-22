"use client";

import { useActionState } from "react";
import { createAnnouncementAction } from "../actions";
import { ORDERED_ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import { LessonContentEditor } from "@/app/admin/lessons/lesson-content-editor";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { AnnouncementAudienceFields } from "../audience-fields";

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
        <AnnouncementAudienceFields />
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
