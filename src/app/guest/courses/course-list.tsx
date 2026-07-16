import Link from "next/link";
import { BookOpen, ChevronRight, Video } from "lucide-react";
import type { GuestCourseItem } from "@/lib/guest-courses";
import { Badge } from "@/components/ui/badge";

export type { GuestCourseItem };

export function GuestCourseList({ courses }: { courses: GuestCourseItem[] }) {
  if (courses.length === 0) {
    return <p className="text-sm text-muted">Hiện chưa có khóa học công khai nào.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={course.href}
          className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
        >
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
            {course.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.coverImageUrl} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${course.gradient}`}
              >
                <Video className="h-9 w-9 text-white/90" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-5">
            {(course.isFree || course.fullyUnlocked) && (
              <div className="mb-2">
                <Badge color="success">{course.isFree ? "Miễn phí" : "Đã mở khóa"}</Badge>
              </div>
            )}
            <p className="font-semibold text-dark-foreground">{course.title}</p>
            {course.description && (
              <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
            )}
            <div className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-4">
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                <BookOpen className="h-3.5 w-3.5" />
                {course.totalLessons} bài học
              </span>
              <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-indigo-400">
                {course.ctaLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
