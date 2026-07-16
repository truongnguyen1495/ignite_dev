import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCourseAccessLevels } from "@/lib/access";

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
  // True when this specific course is fully unlocked — via isFree for an
  // anonymous guest, or the real access level (grant/level rule/isFree) for
  // a logged-in student's home teaser. Distinct from isFree so the UI can
  // still show "Miễn phí" specifically vs a plain "Đã mở khóa" for access
  // granted some other way.
  fullyUnlocked: boolean;
};

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

// `student` switches this from the anonymous /guest/courses catalog to a
// logged-in student's home-page "featured" teaser: hrefs point into
// /dashboard/courses (their own, access-checked routes) instead of
// /guest/courses, and "fully unlocked" is decided by their real access level
// (getCourseAccessLevel — grant, level rule, or isFree) instead of just
// isFree. Both call sites share this one function so the two catalogs can
// never drift apart the way they did before (see git history).
export async function getGuestCourseItems({
  onlyFeatured = false,
  student,
}: { onlyFeatured?: boolean; student?: User } = {}): Promise<GuestCourseItem[]> {
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

  const basePath = student ? "/dashboard/courses" : "/guest/courses";

  // Batched (3 queries total) instead of one getCourseAccessLevel call per
  // course — a per-course Promise.all fan-out here once blew through
  // DATABASE_URL's connection_limit=1 on /dashboard/home's featured teaser.
  const accessLevels = student
    ? await getCourseAccessLevels(student, courses.map((course) => course.id))
    : null;

  return courses.map((course, index) => {
    const fullyUnlocked = student ? accessLevels!.get(course.id) === "full" : course.isFree;
    // A fully-unlocked course opens every lesson — every lesson counts as
    // "visible" instead of only the ones opted into visibleToGuest (see
    // requireGuestCourseLessonAccess/requireCourseLessonAccess in
    // src/lib/access.ts, which apply the same rule).
    const visibleLessons = fullyUnlocked ? course.lessons : course.lessons.filter((l) => l.visibleToGuest);
    const firstLessonId = visibleLessons[0]?.id;
    const href = firstLessonId ? `${basePath}/${course.id}/lessons/${firstLessonId}` : `${basePath}/${course.id}`;
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
      fullyUnlocked,
    };
  });
}
