import { prisma } from "@/lib/prisma";
import { GuestCourseList, type GuestCourseItem } from "./course-list";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function GuestCoursesPage() {
  const courses = await prisma.course.findMany({
    where: { visibleToGuest: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true }, take: 1 },
    },
  });

  const items: GuestCourseItem[] = courses.map((course, index) => {
    const firstLessonId = course.lessons[0]?.id;
    const href = firstLessonId
      ? `/guest/courses/${course.id}/lessons/${firstLessonId}`
      : `/guest/courses/${course.id}`;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      totalLessons: course._count.lessons,
      href,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
        <p className="mt-1 text-sm text-muted">Các khóa học được công khai cho khách xem — không cần đăng nhập.</p>
      </div>

      <GuestCourseList courses={items} />
    </div>
  );
}
