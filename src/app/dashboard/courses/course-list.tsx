"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Lock, Video, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";

const STORAGE_KEY = "student-courses-view";

export type StudentCourseItem = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  unlocked: boolean;
  totalLessons: number;
  completedCount: number;
  progressPercent: number;
  href: string;
  gradient: string;
};

function Thumbnail({ course, className }: { course: StudentCourseItem; className: string }) {
  if (course.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={course.coverImageUrl} alt={course.title} className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br ${course.gradient}`}>
      {course.unlocked ? (
        <Video className="h-9 w-9 text-white/90" />
      ) : (
        <Lock className="h-9 w-9 text-white/90" />
      )}
    </div>
  );
}

function ProgressBar({ course }: { course: StudentCourseItem }) {
  if (!course.unlocked || course.totalLessons === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span>Tiến độ</span>
        <span>
          {course.completedCount}/{course.totalLessons} bài
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-dark-surface-raised">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${course.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function CourseList({ courses }: { courses: StudentCourseItem[] }) {
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
    return <p className="text-sm text-muted">Hiện chưa có khóa học độc quyền nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={handleChange} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const card = (
              <div
                className={`flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors ${
                  course.unlocked ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
                  <Thumbnail course={course} className="h-full w-full" />
                  {!course.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {course.unlocked ? (
                    <Badge color="success">Đã mở khóa</Badge>
                  ) : (
                    <Badge color="faint">Chưa mở khóa</Badge>
                  )}
                  <p className="mt-3 font-semibold text-dark-foreground">{course.title}</p>
                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
                  )}
                  {course.unlocked && course.totalLessons > 0 && (
                    <div className="mt-4">
                      <ProgressBar course={course} />
                    </div>
                  )}
                  <div className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-4">
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course.totalLessons} bài học
                    </span>
                    {course.unlocked && (
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-400">
                        Vào học
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            return course.unlocked ? (
              <Link key={course.id} href={course.href} className="block h-full">
                {card}
              </Link>
            ) : (
              <div key={course.id} className="h-full">
                {card}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const row = (
              <div
                className={`flex items-center gap-4 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors ${
                  course.unlocked ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                  <Thumbnail course={course} className="h-full w-full" />
                  {!course.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {course.unlocked ? (
                      <Badge color="success">Đã mở khóa</Badge>
                    ) : (
                      <Badge color="faint">Chưa mở khóa</Badge>
                    )}
                    <p className="truncate font-semibold text-dark-foreground">{course.title}</p>
                  </div>
                  {course.description && (
                    <p className="line-clamp-1 text-sm text-dark-muted">{course.description}</p>
                  )}
                </div>
                <div className="hidden w-40 shrink-0 sm:block">
                  <ProgressBar course={course} />
                </div>
                <div className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300 md:flex">
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.totalLessons} bài học
                </div>
                {course.unlocked && (
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
                )}
              </div>
            );
            return course.unlocked ? (
              <Link key={course.id} href={course.href}>
                {row}
              </Link>
            ) : (
              <div key={course.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
