import Link from "next/link";
import { Video, BookOpen, Lock, ArrowRight } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function StudentCoursesPage() {
  const student = await requireActiveStudent();

  const [courses, grants] = await Promise.all([
    prisma.course.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { lessons: true } } },
    }),
    prisma.courseAccessGrant.findMany({ where: { studentId: student.id } }),
  ]);

  const grantedCourseIds = new Set(grants.map((g) => g.courseId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
        <p className="mt-1 text-sm text-muted">
          Các khóa học nằm ngoài 5 cấp đào tạo — chỉ xem được khi Super Admin cấp quyền riêng.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-muted">Hiện chưa có khóa học độc quyền nào.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => {
            const unlocked = grantedCourseIds.has(course.id);
            const gradient = BANNER_GRADIENTS[index % BANNER_GRADIENTS.length];

            const card = (
              <div
                className={`overflow-hidden rounded-xl border border-border bg-surface transition-colors ${
                  unlocked ? "hover:border-primary/50" : "opacity-70"
                }`}
              >
                <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                  {unlocked ? (
                    <Video className="h-9 w-9 text-white/90" />
                  ) : (
                    <Lock className="h-9 w-9 text-white/90" />
                  )}
                </div>
                <div className="p-5">
                  {unlocked ? (
                    <Badge color="success">Đã mở khóa</Badge>
                  ) : (
                    <Badge color="faint">Chưa mở khóa</Badge>
                  )}
                  <p className="mt-3 font-semibold text-foreground">{course.title}</p>
                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{course.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course._count.lessons} bài học
                    </span>
                    {unlocked && (
                      <span className="flex items-center gap-1 font-medium text-primary">
                        Xem khóa học
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return unlocked ? (
              <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                {card}
              </Link>
            ) : (
              <div key={course.id}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
