import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CourseList, type StudentCourseItem } from "./course-list";

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

  const items: StudentCourseItem[] = courses.map((course, index) => {
    const unlocked = grantedCourseIds.has(course.id);
    const totalLessons = course._count.lessons;
    const completedCount = completedCountByCourse.get(course.id) ?? 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const firstLessonId = course.lessons[0]?.id;
    const href = firstLessonId
      ? `/dashboard/courses/${course.id}/lessons/${firstLessonId}`
      : `/dashboard/courses/${course.id}`;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      unlocked,
      totalLessons,
      completedCount,
      progressPercent,
      href,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
        <p className="mt-1 text-sm text-muted">
          Các khóa học nằm ngoài 5 cấp đào tạo — chỉ xem được khi Super Admin cấp quyền riêng.
        </p>
      </div>

      <CourseList courses={items} />
    </div>
  );
}
