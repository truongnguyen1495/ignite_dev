import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, isSalesEnabled } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { EditCourseForm } from "./edit-course-form";
import { DeleteCourseButton } from "./delete-course-button";
import {
  RevokeAccessButton,
  GrantAccessForm,
  GrantLevelAccessForm,
  RevokeLevelAccessButton,
  ToggleOpenToProspectiveStudents,
} from "./access-grants";
import { CourseLessonsSection } from "./course-lessons-section";
import { CourseGuestAccessForm } from "./course-guest-access-form";
import { Card } from "@/components/ui/card";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdminPermission("MANAGE_COURSES");
  const { courseId } = await params;
  const salesEnabled = await isSalesEnabled();

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

  // "Học viên" (đã xếp cấp) và "Học sinh" (chưa xếp cấp) are kept as two
  // independent lists/pickers throughout the admin, matching the rest of
  // the app's Học sinh/Học viên split — see the ToggleOpenToProspectiveStudents
  // card below for the "grant to all học sinh at once" continuous rule.
  const hocVienGrants = course.grants.filter((g) => g.student.grantedLevel !== null);
  const hocSinhGrants = course.grants.filter((g) => g.student.grantedLevel === null);
  const ungrantedHocVien = ungrantedStudents.filter((s) => s.grantedLevel !== null);
  const ungrantedHocSinh = ungrantedStudents.filter((s) => s.grantedLevel === null);

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <EditCourseForm
        courseId={course.id}
        title={course.title}
        description={course.description}
        coverImageUrl={course.coverImageUrl}
        order={course.order}
        price={course.price}
        salesEnabled={salesEnabled}
        featuredOnHome={course.featuredOnHome}
      />

      <CourseLessonsSection courseId={course.id} lessons={course.lessons} />

      <CourseGuestAccessForm
        courseId={course.id}
        hiddenFromGuest={course.hiddenFromGuest}
        lessons={course.lessons}
      />

      <Card padding="lg" className="space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Học viên được cấp quyền ({hocVienGrants.length})
          </h2>
          {hocVienGrants.length === 0 ? (
            <p className="text-sm text-muted">Chưa cấp quyền cho học viên nào.</p>
          ) : (
            <ul className="space-y-2">
              {hocVienGrants.map((grant) => (
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

          {ungrantedHocVien.length > 0 && (
            <GrantAccessForm courseId={course.id} students={ungrantedHocVien} />
          )}
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Cấp quyền theo cấp</h2>
          <p className="text-xs text-muted">
            Học viên đủ cấp — kể cả lên cấp sau này — sẽ tự động xem được khóa học này, không cần cấp lại thủ
            công.
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
        </div>
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Học sinh được cấp quyền ({hocSinhGrants.length})
        </h2>
        <p className="text-xs text-muted">
          Học sinh (tài khoản chưa xếp cấp) không thuộc thang 5 cấp nên không dùng được luật &ldquo;Cấp quyền
          theo cấp&rdquo; ở trên — dùng công tắc bên dưới để mở cho tất cả, hoặc cấp riêng từng người.
        </p>
        {!course.hiddenFromGuest && (
          <p className="rounded-lg border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning">
            Khóa học này đang <span className="font-semibold">không bị ẩn khỏi khách</span> (mục &ldquo;Cấp
            quyền học thử cho khách&rdquo; bên dưới danh sách bài học) nên mọi học sinh đều xem được các bài{" "}
            <span className="font-semibold">học thử</span> đã tick ở đó, giống trang khách, dù công tắc dưới
            đây đang tắt và chưa cấp quyền riêng cho ai. Bật công tắc hoặc cấp quyền riêng để họ xem được
            full.
          </p>
        )}
        <ToggleOpenToProspectiveStudents courseId={course.id} open={course.openToProspectiveStudents} />
        {hocSinhGrants.length === 0 ? (
          <p className="text-sm text-muted">Chưa cấp quyền riêng cho học sinh nào.</p>
        ) : (
          <ul className="space-y-2">
            {hocSinhGrants.map((grant) => (
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

        {ungrantedHocSinh.length > 0 && (
          <GrantAccessForm
            courseId={course.id}
            students={ungrantedHocSinh}
            placeholder="Chọn học sinh..."
            submitLabel="Cấp quyền"
          />
        )}
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
      </Card>
    </div>
  );
}
