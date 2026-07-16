import { redirect } from "next/navigation";
import { requireGuestCourseAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flag.
export const dynamic = "force-dynamic";

export default async function GuestCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await requireGuestCourseAccess(courseId);

  // A free course opens every lesson to guests (see requireGuestCourseLessonAccess
  // in src/lib/access.ts) — the first lesson by order, not just the first one
  // opted into visibleToGuest.
  const firstLesson = await prisma.courseLesson.findFirst({
    where: course.isFree ? { courseId } : { courseId, visibleToGuest: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (firstLesson) {
    redirect(`/guest/courses/${courseId}/lessons/${firstLesson.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/guest/courses">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{course.title}</h1>
        {course.description && <p className="mt-1 text-sm text-muted">{course.description}</p>}
      </div>
      <p className="text-sm text-muted">Khóa học này chưa có bài học nào được công khai.</p>
    </div>
  );
}
