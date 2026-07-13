"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setCourseGuestAccessAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Lesson = {
  id: string;
  title: string;
  visibleToGuest: boolean;
};

export function CourseGuestAccessForm({
  courseId,
  hiddenFromGuest,
  featuredOnHome,
  lessons,
}: {
  courseId: string;
  hiddenFromGuest: boolean;
  featuredOnHome: boolean;
  lessons: Lesson[];
}) {
  const [error, formAction, pending] = useActionState(setCourseGuestAccessAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Card padding="lg" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Cấp quyền học thử cho khách</h2>
        <p className="mt-1 text-xs text-muted">
          Tick chọn những bài học khách (chưa đăng nhập) được xem thử. Không tick bài nào thì khóa học coi
          như đang khóa với khách — vẫn hiện trong danh sách nhưng không có gì để xem thử.
        </p>
      </div>

      <form
        action={formAction}
        onChange={() => setIsDirty(true)}
        className="space-y-3"
      >
        <input type="hidden" name="courseId" value={courseId} />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="hiddenFromGuest"
            defaultChecked={hiddenFromGuest}
            className="h-4 w-4 accent-primary"
          />
          Không công khai cho khách (ẩn hoàn toàn khóa học này khỏi trang khách)
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="featuredOnHome"
            defaultChecked={featuredOnHome}
            className="h-4 w-4 accent-primary"
          />
          Hiện trong mục &quot;Khóa học nổi bật&quot; ở trang chủ khách
        </label>

        {lessons.length === 0 ? (
          <p className="text-sm text-muted">Chưa có bài học nào để chọn.</p>
        ) : (
          <ul className="space-y-1.5 rounded-lg border border-border bg-background p-3">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="trialLessonIds"
                    value={lesson.id}
                    defaultChecked={lesson.visibleToGuest}
                    className="h-4 w-4 accent-primary"
                  />
                  {lesson.title}
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          size="sm"
          variant={isDirty ? "primary" : "secondary"}
          disabled={pending || !isDirty}
          isLoading={pending}
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
      </form>
    </Card>
  );
}
