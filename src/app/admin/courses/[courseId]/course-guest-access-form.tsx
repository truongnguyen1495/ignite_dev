"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setCourseGuestAccessAction } from "../actions";
import { groupLessonsByChapter } from "@/lib/course-lessons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Lesson = {
  id: string;
  title: string;
  visibleToGuest: boolean;
  chapterId: string | null;
};

type Chapter = { id: string; title: string };

export function CourseGuestAccessForm({
  courseId,
  hiddenFromGuest,
  featuredOnHome,
  chapters,
  lessons,
}: {
  courseId: string;
  hiddenFromGuest: boolean;
  featuredOnHome: boolean;
  chapters: Chapter[];
  lessons: Lesson[];
}) {
  const [error, formAction, pending] = useActionState(setCourseGuestAccessAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  // Positive framing ("hiển thị") instead of the DB's own hiddenFromGuest —
  // drives whether the chapter/lesson picker below is revealed at all, not
  // just the checkbox's own on-screen label.
  const [visibleToGuest, setVisibleToGuest] = useState(!hiddenFromGuest);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  // Chapter numbers are always derived from list position, never stored —
  // see the comment on the CourseChapter model in schema.prisma.
  const chapterNumberById = new Map(chapters.map((c, i) => [c.id, i + 1]));
  const lessonNumberById = new Map(lessons.map((l, i) => [l.id, i + 1]));
  const lessonGroups = groupLessonsByChapter(lessons, chapters);

  return (
    <Card padding="lg" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Cấp quyền học thử cho khách</h2>
        <p className="mt-1 text-xs text-muted">
          Bật &quot;Hiển thị cho khách xem&quot; rồi tick chọn những bài học khách (chưa đăng nhập) được xem
          thử. Tắt đi thì khóa học bị ẩn hoàn toàn khỏi trang khách, không cần chọn bài nào.
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
            name="visibleToGuest"
            defaultChecked={!hiddenFromGuest}
            onChange={(e) => setVisibleToGuest(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Hiển thị cho khách xem
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

        {/* Checkboxes stay mounted (just visually hidden) while the master
            toggle is off, so an admin's saved trial-lesson picks survive
            toggling "Hiển thị cho khách xem" off and back on — a
            conditionally-UNRENDERED checklist would drop its checked values
            from the next form submission and silently wipe them. */}
        <div className={visibleToGuest ? "space-y-1.5" : "hidden"}>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted">Chưa có bài học nào để chọn.</p>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              {lessonGroups.map((group) => (
                <div key={group.chapterId ?? "__unassigned__"} className="space-y-1.5">
                  {lessonGroups.length > 1 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.chapterId
                        ? `Chương ${String(chapterNumberById.get(group.chapterId)).padStart(2, "0")}: ${group.chapterTitle}`
                        : "Chưa xếp chương"}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {group.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            name="trialLessonIds"
                            value={lesson.id}
                            defaultChecked={lesson.visibleToGuest}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-xs text-faint">Bài {lessonNumberById.get(lesson.id)}.</span>
                          {lesson.title}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

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
