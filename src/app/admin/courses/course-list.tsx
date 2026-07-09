"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Video } from "lucide-react";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";

const STORAGE_KEY = "admin-courses-view";

export type AdminCourseItem = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  lessonsCount: number;
  grantsCount: number;
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

export function CourseList({ courses }: { courses: AdminCourseItem[] }) {
  const [mode, setMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "grid" || saved === "list") {
      setMode(saved);
    }
  }, []);

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
              className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-dark-surface-raised">
                <Thumbnail course={course} className="h-full w-full" />
              </div>
              <div className="p-5">
                <p className="font-semibold text-dark-foreground">{course.title}</p>
                {course.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-dark-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.lessonsCount} bài học
                  </span>
                  <span className="flex items-center gap-1">
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
                {course.description && (
                  <p className="line-clamp-1 text-sm text-dark-muted">{course.description}</p>
                )}
              </div>
              <div className="hidden shrink-0 items-center gap-4 text-xs text-dark-muted sm:flex">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.lessonsCount} bài học
                </span>
                <span className="flex items-center gap-1">
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
