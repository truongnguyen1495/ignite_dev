import { redirect } from "next/navigation";
import { requireCourseAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";

// The lesson-viewing page now has a sidebar listing every lesson in the
// course, so this index page no longer needs its own flat lesson list — it
// just forwards straight to the first lesson. Kept as a route (rather than
// removed) so old links/bookmarks to /dashboard/courses/[courseId] still go
// somewhere sensible.
export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await requireCourseAccess(courseId);

  const firstLesson = await prisma.courseLesson.findFirst({
    where: { courseId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (firstLesson) {
    redirect(`/dashboard/courses/${courseId}/lessons/${firstLesson.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/courses">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{course.title}</h1>
        {course.description && <p className="mt-1 text-sm text-muted">{course.description}</p>}
      </div>
      <p className="text-sm text-muted">Khóa học này chưa có bài học nào.</p>
    </div>
  );
}
