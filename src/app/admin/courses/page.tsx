import Link from "next/link";
import { Plus, BookOpen, Users, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true, grants: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Thêm khóa học
        </Link>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {courses.length === 0 ? (
          <p className="text-sm text-neutral-400">Chưa có khóa học nào.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => {
              const gradient = BANNER_GRADIENTS[index % BANNER_GRADIENTS.length];
              return (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}`}
                  className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 transition-colors hover:border-primary/60"
                >
                  <div className="relative h-28 w-full overflow-hidden bg-neutral-800">
                    {course.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.coverImageUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
                      >
                        <Video className="h-9 w-9 text-white/90" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-semibold text-white">{course.title}</p>
                    {course.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{course.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course._count.lessons} bài học
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {course._count.grants} học viên
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
