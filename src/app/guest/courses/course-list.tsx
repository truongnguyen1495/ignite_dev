import Link from "next/link";
import { BookOpen, Video } from "lucide-react";

export type GuestCourseItem = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  totalLessons: number;
  href: string;
  gradient: string;
};

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
          className="overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-dark-surface-raised">
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
          <div className="p-5">
            <p className="font-semibold text-dark-foreground">{course.title}</p>
            {course.description && (
              <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
            )}
            <span className="mt-4 flex items-center gap-1 text-xs text-dark-muted">
              <BookOpen className="h-3.5 w-3.5" />
              {course.totalLessons} bài học
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
