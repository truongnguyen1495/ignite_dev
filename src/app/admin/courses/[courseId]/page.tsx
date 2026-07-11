import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { EditCourseForm } from "./edit-course-form";
import { DeleteCourseButton } from "./delete-course-button";
import {
  RevokeAccessButton,
  GrantAccessForm,
  GrantLevelAccessForm,
  RevokeLevelAccessButton,
} from "./access-grants";
import { CourseLessonsSection } from "./course-lessons-section";
import { Card } from "@/components/ui/card";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdminPermission("MANAGE_COURSES");
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: { order: "asc" } },
      grants: { include: { student: true }, orderBy: { grantedAt: "desc" } },
      levelGrants: { orderBy: { minLevel: "asc" } },
    },
  });
  if (!course) {
    notFound();
  }

  const grantedStudentIds = new Set(course.grants.map((g) => g.studentId));
  const ungrantedStudents = await prisma.user.findMany({
    where: { role: "STUDENT", adminOnly: false, id: { notIn: [...grantedStudentIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <EditCourseForm
        courseId={course.id}
        title={course.title}
        description={course.description}
        coverImageUrl={course.coverImageUrl}
        order={course.order}
        visibleToGuest={course.visibleToGuest}
        featuredOnHome={course.featuredOnHome}
      />

      <CourseLessonsSection courseId={course.id} lessons={course.lessons} />

      <Card padding="lg" className="space-y-3">
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
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Cấp quyền theo cấp</h2>
        <p className="text-xs text-muted">
          Học viên đủ cấp — kể cả lên cấp sau này — sẽ tự động xem được khóa học này, không cần cấp lại thủ công.
        </p>
        {course.levelGrants.length === 0 ? (
          <p className="text-sm text-muted">Chưa có luật cấp nào.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {course.levelGrants.map((levelGrant) => (
              <li
                key={levelGrant.id}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm text-primary"
              >
                {LEVEL_LABELS[levelGrant.minLevel]} trở lên
                <RevokeLevelAccessButton grantId={levelGrant.id} courseId={course.id} />
              </li>
            ))}
          </ul>
        )}
        <GrantLevelAccessForm courseId={course.id} />
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
      </Card>
    </div>
  );
}
