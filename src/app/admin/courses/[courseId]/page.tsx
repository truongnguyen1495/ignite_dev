import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { EditCourseForm } from "./edit-course-form";
import { DeleteCourseButton } from "./delete-course-button";
import { RevokeAccessButton, GrantAccessForm } from "./access-grants";
import { DeleteCourseLessonInlineButton } from "./delete-course-lesson-inline-button";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: { order: "asc" } },
      grants: { include: { student: true }, orderBy: { grantedAt: "desc" } },
    },
  });
  if (!course) {
    notFound();
  }

  const grantedStudentIds = new Set(course.grants.map((g) => g.studentId));
  const ungrantedStudents = await prisma.user.findMany({
    where: { role: "STUDENT", id: { notIn: [...grantedStudentIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/courses">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{course.title}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8">
        <EditCourseForm
          courseId={course.id}
          title={course.title}
          description={course.description}
          order={course.order}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Bài học ({course.lessons.length})</h2>
          <Link
            href={`/admin/courses/${course.id}/lessons/new`}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm bài học
          </Link>
        </div>
        {course.lessons.length === 0 ? (
          <p className="text-sm text-muted">Chưa có bài học nào.</p>
        ) : (
          <ul className="space-y-2">
            {course.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 hover:border-primary/50"
              >
                <Link
                  href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-foreground">{lesson.title}</span>
                  {lesson.youtubeId && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Video className="h-3.5 w-3.5" />
                      Có video
                    </span>
                  )}
                </Link>
                <DeleteCourseLessonInlineButton
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  courseId={course.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-sm font-semibold text-foreground">
          Học viên được cấp quyền ({course.grants.length})
        </h2>
        {course.grants.length === 0 ? (
          <p className="text-sm text-muted">Chưa cấp quyền cho học viên nào.</p>
        ) : (
          <ul className="space-y-2">
            {course.grants.map((grant) => (
              <li
                key={grant.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div>
                  <p className="text-foreground">{grant.student.name}</p>
                  <p className="text-muted">{grant.student.email}</p>
                </div>
                <RevokeAccessButton grantId={grant.id} courseId={course.id} />
              </li>
            ))}
          </ul>
        )}

        {ungrantedStudents.length > 0 && (
          <GrantAccessForm courseId={course.id} students={ungrantedStudents} />
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
      </div>
    </div>
  );
}
