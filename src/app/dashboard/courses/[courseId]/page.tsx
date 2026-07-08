import Link from "next/link";
import { Video } from "lucide-react";
import { requireCourseAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await requireCourseAccess(courseId);

  const lessons = await prisma.courseLesson.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/courses">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{course.title}</h1>
        {course.description && <p className="mt-1 text-sm text-muted">{course.description}</p>}
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Khóa học này chưa có bài học nào.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/dashboard/courses/${courseId}/lessons/${lesson.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/50"
              >
                <Video className="h-4 w-4 text-primary" />
                <span className="text-foreground">{lesson.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
