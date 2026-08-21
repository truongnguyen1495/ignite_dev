import { requireActiveStudent, isSalesEnabled, type CourseAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { CourseList, type StudentCourseItem } from "./course-list";

// Năm dải màu bìa cho mục chưa có ảnh. Mọi mục phải có dải thật và không
// trùng nhau: trong bảng màu này --level-3 trùng đúng --primary và --level-5
// trùng đúng --info, nên dùng thẳng chúng ở đây sẽ ra một mục phẳng lì và một
// cặp giống hệt nhau. Icon đặt trên các dải này là chữ navy, không phải trắng.
const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--primary-hover)] to-[var(--accent)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--accent)]",
  "from-[var(--warning)] to-[var(--info)]",
];

export default async function StudentCoursesPage() {
  const student = await requireActiveStudent();

  const [courses, grants, levelGrants, completions, salesEnabled] = await Promise.all([
    prisma.course.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { lessons: true } },
        lessons: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true, visibleToGuest: true },
        },
      },
    }),
    prisma.courseAccessGrant.findMany({ where: { studentId: student.id } }),
    prisma.courseLevelGrant.findMany(),
    prisma.courseLessonCompletion.findMany({
      where: { studentId: student.id },
      select: { courseLesson: { select: { courseId: true } } },
    }),
    isSalesEnabled(),
  ]);

  const grantedCourseIds = new Set(grants.map((g) => g.courseId));
  const levelUnlockedCourseIds = new Set(
    levelGrants
      .filter((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel))
      .map((lg) => lg.courseId)
  );

  const completedCountByCourse = new Map<string, number>();
  for (const completion of completions) {
    const courseId = completion.courseLesson.courseId;
    completedCountByCourse.set(courseId, (completedCountByCourse.get(courseId) ?? 0) + 1);
  }

  const items: StudentCourseItem[] = courses.map((course, index) => {
    let accessLevel: CourseAccessLevel;
    if (course.isFree || grantedCourseIds.has(course.id)) {
      accessLevel = "full";
    } else {
      accessLevel = levelUnlockedCourseIds.has(course.id) ? "full" : !course.hiddenFromGuest ? "trial" : "none";
    }

    const totalLessons = course._count.lessons;
    const completedCount = completedCountByCourse.get(course.id) ?? 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const firstLesson =
      accessLevel === "trial" ? course.lessons.find((l) => l.visibleToGuest) : course.lessons[0];
    const href = firstLesson
      ? `/dashboard/courses/${course.id}/lessons/${firstLesson.id}`
      : `/dashboard/courses/${course.id}`;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      accessLevel,
      totalLessons,
      completedCount,
      progressPercent,
      href,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
      price: course.price,
      salePrice: course.salePrice,
      isFree: course.isFree,
      salesEnabled,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
        <p className="mt-1 text-sm text-muted">
          Các khóa học nằm ngoài 6 cấp đào tạo — chỉ xem được khi Super Admin cấp quyền riêng.
        </p>
      </div>

      <CourseList courses={items} />
    </div>
  );
}
