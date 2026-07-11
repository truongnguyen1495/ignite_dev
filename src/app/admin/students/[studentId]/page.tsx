import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateOnlyVN, formatDateTimeVN } from "@/lib/date";
import { requireAnyAdminPermission, getAdminPermissions } from "@/lib/access";
import { EditStudentForm } from "./edit-student-form";
import { DeleteStudentButton, ToggleStudentStatusButton, DemoteStudentButton } from "./danger-actions";
import { LEVEL_LABELS, hasLevelAccess, levelRank } from "@/lib/levels";
import { CollapsibleSection } from "./collapsible-section";
import { AttemptGroup } from "./attempt-group";
import { Card } from "@/components/ui/card";
import type { Level } from "@prisma/client";

const LEVEL_UP_STATUS_LABELS = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const admin = await requireAnyAdminPermission(["MANAGE_STUDENTS", "MANAGE_PROSPECTIVE_STUDENTS"]);
  const { studentId } = await params;
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT" || student.adminOnly) {
    notFound();
  }

  // Editing/locking/deleting an existing account each need their own
  // permission, decided by which the target actually is right now (a
  // "học viên" with grantedLevel set, or a "học sinh") — MANAGE_STUDENTS/
  // MANAGE_PROSPECTIVE_STUDENTS (this page's own gate) only cover viewing +
  // creating. Demoting only ever applies to a học viên target.
  const isSuperAdmin = admin.role === "SUPER_ADMIN";
  const isHocVien = student.grantedLevel !== null;
  const granted = isSuperAdmin ? null : await getAdminPermissions(admin.id);
  const canEdit = isSuperAdmin || !!granted?.has(isHocVien ? "EDIT_STUDENTS" : "EDIT_PROSPECTIVE_STUDENTS");
  const canLock = isSuperAdmin || !!granted?.has(isHocVien ? "LOCK_STUDENTS" : "LOCK_PROSPECTIVE_STUDENTS");
  const canDelete = isSuperAdmin || !!granted?.has(isHocVien ? "DELETE_STUDENTS" : "DELETE_PROSPECTIVE_STUDENTS");
  const canDemote = isSuperAdmin || !!granted?.has("DEMOTE_STUDENTS");

  const [attempts, levelUpRequests, courseGrants, courseLevelGrants] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { attemptedAt: "desc" },
      include: { quiz: { include: { lesson: true } } },
    }),
    prisma.levelUpRequest.findMany({
      where: { studentId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.courseAccessGrant.findMany({
      where: { studentId },
      orderBy: { grantedAt: "desc" },
      include: { course: { select: { id: true, title: true } } },
    }),
    prisma.courseLevelGrant.findMany({
      include: { course: { select: { id: true, title: true } } },
    }),
  ]);

  const hasRegistrationInfo = Boolean(student.username || student.dateOfBirth || student.phoneNumber);

  const grantedCourses = courseGrants.map((g) => g.course);
  const grantedCourseIds = new Set(grantedCourses.map((c) => c.id));
  const levelUnlockedCoursesById = new Map<string, { id: string; title: string; minLevel: Level }>();
  for (const lg of courseLevelGrants) {
    if (grantedCourseIds.has(lg.courseId)) continue;
    if (!hasLevelAccess(student.grantedLevel, lg.minLevel)) continue;
    const existing = levelUnlockedCoursesById.get(lg.courseId);
    if (!existing || levelRank(lg.minLevel) > levelRank(existing.minLevel)) {
      levelUnlockedCoursesById.set(lg.courseId, { ...lg.course, minLevel: lg.minLevel });
    }
  }
  const levelUnlockedCourses = Array.from(levelUnlockedCoursesById.values());

  // A student can retake the same quiz many times; grouping by quiz collapses
  // those into one row (the latest attempt) with the rest tucked behind an
  // expand toggle, same pattern as the admin results page.
  const attemptGroups = new Map<
    string,
    { lessonTitle: string; latest: (typeof attempts)[number]; history: (typeof attempts)[number][] }
  >();
  for (const attempt of attempts) {
    const group = attemptGroups.get(attempt.quizId);
    if (group) {
      group.history.push(attempt);
    } else {
      attemptGroups.set(attempt.quizId, {
        lessonTitle: attempt.quiz.lesson.title,
        latest: attempt,
        history: [],
      });
    }
  }
  const groupedAttempts = Array.from(attemptGroups.values());

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <EditStudentForm
        studentId={student.id}
        name={student.name}
        email={student.email}
        phoneNumber={student.phoneNumber}
        grantedLevel={student.grantedLevel}
        status={student.status}
        hasRegistrationInfo={hasRegistrationInfo}
        username={student.username}
        dateOfBirthLabel={student.dateOfBirth ? formatDateOnlyVN(student.dateOfBirth) : null}
        canEdit={canEdit}
        canDemote={canDemote}
      />

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Khóa học độc quyền được cấp quyền ({grantedCourses.length + levelUnlockedCourses.length})
        </h2>
        {grantedCourses.length === 0 && levelUnlockedCourses.length === 0 ? (
          <p className="text-sm text-muted">Học viên chưa được cấp quyền khóa học độc quyền nào.</p>
        ) : (
          <ul className="space-y-2">
            {grantedCourses.map((course) => (
              <li
                key={course.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <Link href={`/admin/courses/${course.id}`} className="text-foreground hover:text-primary">
                  {course.title}
                </Link>
                <span className="text-xs text-muted">Cấp trực tiếp</span>
              </li>
            ))}
            {levelUnlockedCourses.map((course) => (
              <li
                key={course.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <Link href={`/admin/courses/${course.id}`} className="text-foreground hover:text-primary">
                  {course.title}
                </Link>
                <span className="text-xs text-muted">Qua {LEVEL_LABELS[course.minLevel]} trở lên</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CollapsibleSection title={`Lịch sử làm bài test (${attempts.length})`}>
          {groupedAttempts.length === 0 ? (
            <p className="text-sm text-muted">Học viên chưa làm bài test nào.</p>
          ) : (
            <ul className="space-y-2">
              {groupedAttempts.map(({ lessonTitle, latest, history }) => (
                <AttemptGroup key={latest.id} lessonTitle={lessonTitle} latest={latest} history={history} />
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </Card>

      <Card>
        <CollapsibleSection title={`Lịch sử xin lên cấp (${levelUpRequests.length})`}>
          {levelUpRequests.length === 0 ? (
            <p className="text-sm text-muted">Học viên chưa gửi yêu cầu lên cấp nào.</p>
          ) : (
            <ul className="space-y-2">
              {levelUpRequests.map((req) => (
                <li key={req.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {req.fromLevel ? LEVEL_LABELS[req.fromLevel] : "Học sinh"}
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted" />
                      {LEVEL_LABELS[req.toLevel]}
                    </span>
                    {req.status === "APPROVED" ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                      </span>
                    ) : req.status === "REJECTED" ? (
                      <span className="flex items-center gap-1 text-danger">
                        <XCircle className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                      </span>
                    ) : (
                      <span className="text-warning">{LEVEL_UP_STATUS_LABELS[req.status]}</span>
                    )}
                  </div>
                  <div className="mt-1 text-muted">
                    {formatDateTimeVN(req.requestedAt)}
                    {req.status === "REJECTED" && req.reviewerNote && ` — Lý do: ${req.reviewerNote}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </Card>

      {(canLock || canDelete || (isHocVien && canDemote)) && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
          <div className="flex flex-wrap items-center gap-3">
            {isHocVien && canDemote && (
              <DemoteStudentButton studentId={student.id} studentName={student.name} />
            )}
            {canLock && (
              <ToggleStudentStatusButton studentId={student.id} locked={student.status === "LOCKED"} />
            )}
            {canDelete && (
              <DeleteStudentButton studentId={student.id} studentName={student.name} redirectAfter />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
