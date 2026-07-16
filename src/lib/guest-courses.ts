import "server-only";
import { prisma } from "@/lib/prisma";

export type GuestCourseItem = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  totalLessons: number;
  ctaLabel: string;
  href: string;
  gradient: string;
  isFree: boolean;
};

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export async function getGuestCourseItems({
  onlyFeatured = false,
}: { onlyFeatured?: boolean } = {}): Promise<GuestCourseItem[]> {
  const courses = await prisma.course.findMany({
    where: onlyFeatured
      ? { hiddenFromGuest: false, featuredOnHome: true }
      : { hiddenFromGuest: false },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, visibleToGuest: true },
      },
    },
  });

  return courses.map((course, index) => {
    const visibleLessons = course.lessons.filter((l) => l.visibleToGuest);
    const firstLessonId = visibleLessons[0]?.id;
    const href = firstLessonId
      ? `/guest/courses/${course.id}/lessons/${firstLessonId}`
      : `/guest/courses/${course.id}`;
    // Some lessons still locked behind login → this is a trial, not full access.
    const hasLockedLessons = visibleLessons.length < course.lessons.length;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      totalLessons: course.lessons.length,
      ctaLabel: hasLockedLessons ? "Vào học thử" : "Vào học",
      href,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
      isFree: course.isFree,
    };
  });
}
