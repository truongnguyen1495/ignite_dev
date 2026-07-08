import Link from "next/link";
import { Plus, BookOpen, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

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

      {courses.length === 0 ? (
        <p className="text-sm text-muted">Chưa có khóa học nào.</p>
      ) : (
        <ul className="space-y-2">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/admin/courses/${course.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-4 hover:border-primary/50"
              >
                <span className="text-foreground">{course.title}</span>
                <span className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course._count.lessons} bài học
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course._count.grants} học viên
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
