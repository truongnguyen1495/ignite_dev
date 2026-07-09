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

  const [courses, grants, completions] = await Promise.all([
    prisma.course.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { lessons: true } },
        lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true }, take: 1 },
      },
    }),
    prisma.courseAccessGrant.findMany({ where: { studentId: student.id } }),
    prisma.courseLessonCompletion.findMany({
      where: { studentId: student.id },
      select: { courseLesson: { select: { courseId: true } } },
    }),
  ]);

  const grantedCourseIds = new Set(grants.map((g) => g.courseId));

  const completedCountByCourse = new Map<string, number>();
  for (const completion of completions) {
    const courseId = completion.courseLesson.courseId;
    completedCountByCourse.set(courseId, (completedCountByCourse.get(courseId) ?? 0) + 1);
  }

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
            const totalLessons = course._count.lessons;
            const completedCount = completedCountByCourse.get(course.id) ?? 0;
            const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
            const firstLessonId = course.lessons[0]?.id;
            const href = firstLessonId
              ? `/dashboard/courses/${course.id}/lessons/${firstLessonId}`
              : `/dashboard/courses/${course.id}`;

            const card = (
              <div
                className={`overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 transition-colors ${
                  unlocked ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative h-32 w-full overflow-hidden bg-neutral-800">
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
                      {unlocked ? (
                        <Video className="h-9 w-9 text-white/90" />
                      ) : (
                        <Lock className="h-9 w-9 text-white/90" />
                      )}
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {unlocked ? (
                    <Badge color="success">Đã mở khóa</Badge>
                  ) : (
                    <Badge color="faint">Chưa mở khóa</Badge>
                  )}
                  <p className="mt-3 font-semibold text-white">{course.title}</p>
                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{course.description}</p>
                  )}

                  {unlocked && totalLessons > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Tiến độ</span>
                        <span>
                          {completedCount}/{totalLessons} bài
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {totalLessons} bài học
                    </span>
                    {unlocked && (
                      <span className="flex items-center gap-1 font-medium text-primary">
                        Vào học
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return unlocked ? (
              <Link key={course.id} href={href}>
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
