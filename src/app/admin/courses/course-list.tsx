"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Video } from "lucide-react";
import type { Level } from "@prisma/client";
import { LEVEL_LABELS } from "@/lib/levels";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "admin-courses-view";

export type AdminCourseItem = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  lessonsCount: number;
  grantsCount: number;
  levelGrants: Level[];
  visibleToGuest: boolean;
  gradient: string;
};

function Thumbnail({ course, className }: { course: AdminCourseItem; className: string }) {
  if (course.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={course.coverImageUrl} alt={course.title} className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br ${course.gradient}`}>
      <Video className="h-9 w-9 text-white/90" />
    </div>
  );
}

// Always rendered right under the title (its own row, never wrapping inline
// with a long title) so admins can see at a glance who can reach this
// course: which levels are auto-granted, and whether any students were
// granted individually as an exception on top of that.
function AccessBadges({ course }: { course: AdminCourseItem }) {
  const hasAnyGrant = course.visibleToGuest || course.levelGrants.length > 0 || course.grantsCount > 0;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {course.visibleToGuest && <Badge color="info">Công khai</Badge>}
      {course.levelGrants.map((level) => (
        <Badge key={level} color="primary">
          {LEVEL_LABELS[level]} trở lên
        </Badge>
      ))}
      {course.grantsCount > 0 && (
        <Badge color="warning">{course.grantsCount} học viên ngoại lệ</Badge>
      )}
      {!hasAnyGrant && <Badge color="muted">Chưa cấp quyền</Badge>}
    </div>
  );
}

export function CourseList({ courses }: { courses: AdminCourseItem[] }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  function handleChange(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted">Chưa có khóa học nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={handleChange} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
            >
              <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
                <Thumbnail course={course} className="h-full w-full" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-semibold text-dark-foreground">{course.title}</p>
                <AccessBadges course={course} />
                {course.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
                )}
                <div className="mt-auto flex flex-nowrap items-center gap-4 pt-4">
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.lessonsCount} bài học
                  </span>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                    <Users className="h-3.5 w-3.5" />
                    {course.grantsCount} học viên
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="flex items-center gap-4 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors hover:border-primary/60"
            >
              <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                <Thumbnail course={course} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-dark-foreground">{course.title}</p>
                <AccessBadges course={course} />
                {course.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-dark-muted">{course.description}</p>
                )}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-slate-300 sm:flex">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.lessonsCount} bài học
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Users className="h-3.5 w-3.5" />
                  {course.grantsCount} học viên
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
