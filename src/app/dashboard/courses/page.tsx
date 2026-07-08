import Link from "next/link";
import { Video, BookOpen } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function StudentCoursesPage() {
  const student = await requireActiveStudent();

  const grants = await prisma.courseAccessGrant.findMany({
    where: { studentId: student.id },
    include: { course: { include: { _count: { select: { lessons: true } } } } },
    orderBy: { grantedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>

      {grants.length === 0 ? (
        <p className="text-sm text-muted">Bạn chưa được cấp quyền truy cập khóa học nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {grants.map(({ course }) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Video className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-medium text-foreground">{course.title}</p>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{course.description}</p>
              )}
              <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                <BookOpen className="h-3.5 w-3.5" />
                {course._count.lessons} bài học
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
