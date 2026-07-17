import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateOnlyVN, formatDateTimeVN } from "@/lib/date";
import { requireAnyAdminPermission, getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
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

// The 4 ways a student can end up with full access to a course/library item —
// shown as a label next to each granted item below. Precedence (lowest to
// highest, later overwrites earlier) mirrors getCourseAccessLevel/
// getLibraryItemAccessLevel in src/lib/access.ts: isFree beats an explicit
// grant beats the level/prospective-student rule.
type GrantReason = "free" | "direct" | "purchase" | "level" | "prospective";
type GrantedItemInfo = { id: string; title: string; reason: GrantReason; levelLabel?: string };

function computeGrantedItems(
  items: { id: string; title: string; isFree: boolean; openToProspectiveStudents: boolean }[],
  grants: { itemId: string; grantedById: string | null }[],
  levelGrants: { itemId: string; minLevel: Level }[],
  studentGrantedLevel: Level | null
): GrantedItemInfo[] {
  const byId = new Map<string, GrantedItemInfo>();
  const itemById = new Map(items.map((i) => [i.id, i]));

  // Lowest precedence: the "shared with a whole group" rule — a level
  // threshold for a học viên, or the "mở cho mọi học sinh" flag for a
  // học sinh (a null grantedLevel never matches a Level-typed rule).
  if (studentGrantedLevel === null) {
    for (const item of items) {
      if (item.openToProspectiveStudents) {
        byId.set(item.id, { id: item.id, title: item.title, reason: "prospective" });
      }
    }
  } else {
    const bestLevelByItemId = new Map<string, Level>();
    for (const lg of levelGrants) {
      if (!hasLevelAccess(studentGrantedLevel, lg.minLevel)) continue;
      const existing = bestLevelByItemId.get(lg.itemId);
      if (!existing || levelRank(lg.minLevel) > levelRank(existing)) {
        bestLevelByItemId.set(lg.itemId, lg.minLevel);
      }
    }
    for (const [itemId, minLevel] of bestLevelByItemId) {
      const item = itemById.get(itemId);
      if (item) {
        byId.set(itemId, { id: itemId, title: item.title, reason: "level", levelLabel: LEVEL_LABELS[minLevel] });
      }
    }
  }

  // Middle precedence: an explicit per-student grant row — distinguished by
  // grantedById (null = created by order-fulfillment.ts on purchase, see
  // schema.prisma's Order model comment; non-null = an admin granted it by hand).
  for (const grant of grants) {
    const item = itemById.get(grant.itemId);
    if (item) {
      byId.set(grant.itemId, {
        id: grant.itemId,
        title: item.title,
        reason: grant.grantedById === null ? "purchase" : "direct",
      });
    }
  }

  // Highest precedence: isFree — everyone has full access regardless of any
  // grant/rule above, so it always wins the label.
  for (const item of items) {
    if (item.isFree) {
      byId.set(item.id, { id: item.id, title: item.title, reason: "free" });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function grantReasonLabel(info: GrantedItemInfo): string {
  switch (info.reason) {
    case "free":
      return "Miễn phí toàn hệ thống";
    case "direct":
      return "Cấp trực tiếp";
    case "purchase":
      return "Qua mua hàng";
    case "level":
      return `Qua ${info.levelLabel} trở lên`;
    case "prospective":
      return "Mở cho mọi học sinh";
  }
}

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
  // A non-Super-Admin (even a full-access Admin Manager) must not even view
  // another Admin Manager's student record here, let alone edit/lock/delete
  // it — same boundary as admin/admins/[adminId]/page.tsx and the mutation
  // actions in ../actions.ts.
  if (admin.role !== "SUPER_ADMIN" && student.isAdminManager) {
    notFound();
  }

  // Editing/locking/deleting an existing account each need their own
  // permission, decided by which the target actually is right now (a
  // "học viên" with grantedLevel set, or a "học sinh") — MANAGE_STUDENTS/
  // MANAGE_PROSPECTIVE_STUDENTS (this page's own gate) only cover viewing +
  // creating. Demoting only ever applies to a học viên target.
  const isFullAdmin = hasFullAdminAccess(admin);
  const isHocVien = student.grantedLevel !== null;
  const granted = isFullAdmin ? null : await getAdminPermissions(admin.id);
  const canEdit = isFullAdmin || !!granted?.has(isHocVien ? "EDIT_STUDENTS" : "EDIT_PROSPECTIVE_STUDENTS");
  const canLock = isFullAdmin || !!granted?.has(isHocVien ? "LOCK_STUDENTS" : "LOCK_PROSPECTIVE_STUDENTS");
  const canDelete = isFullAdmin || !!granted?.has(isHocVien ? "DELETE_STUDENTS" : "DELETE_PROSPECTIVE_STUDENTS");
  const canDemote = isFullAdmin || !!granted?.has("DEMOTE_STUDENTS");

  const [attempts, levelUpRequests, courses, courseGrants, courseLevelGrants, libraryItems, libraryGrants, libraryLevelGrants] =
    await Promise.all([
      prisma.quizAttempt.findMany({
        where: { studentId },
        orderBy: { attemptedAt: "desc" },
        include: { quiz: { include: { lesson: true } } },
      }),
      prisma.levelUpRequest.findMany({
        where: { studentId },
        orderBy: { requestedAt: "desc" },
      }),
      prisma.course.findMany({
        select: { id: true, title: true, isFree: true, openToProspectiveStudents: true },
      }),
      prisma.courseAccessGrant.findMany({ where: { studentId } }),
      prisma.courseLevelGrant.findMany(),
      prisma.libraryItem.findMany({
        select: { id: true, title: true, isFree: true, openToProspectiveStudents: true },
      }),
      prisma.libraryAccessGrant.findMany({ where: { studentId } }),
      prisma.libraryLevelGrant.findMany(),
    ]);

  const hasRegistrationInfo = Boolean(student.username || student.dateOfBirth || student.phoneNumber);

  const grantedCourseInfos = computeGrantedItems(
    courses,
    courseGrants.map((g) => ({ itemId: g.courseId, grantedById: g.grantedById })),
    courseLevelGrants.map((lg) => ({ itemId: lg.courseId, minLevel: lg.minLevel })),
    student.grantedLevel
  );
  const grantedLibraryInfos = computeGrantedItems(
    libraryItems,
    libraryGrants.map((g) => ({ itemId: g.libraryItemId, grantedById: g.grantedById })),
    libraryLevelGrants.map((lg) => ({ itemId: lg.libraryItemId, minLevel: lg.minLevel })),
    student.grantedLevel
  );

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
        isHocVien={isHocVien}
      />

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Khóa học độc quyền được cấp quyền ({grantedCourseInfos.length})
        </h2>
        {grantedCourseInfos.length === 0 ? (
          <p className="text-sm text-muted">Học viên chưa được cấp quyền khóa học độc quyền nào.</p>
        ) : (
          <ul className="space-y-2">
            {grantedCourseInfos.map((info) => (
              <li
                key={info.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <Link href={`/admin/courses/${info.id}`} className="text-foreground hover:text-primary">
                  {info.title}
                </Link>
                <span className="text-xs text-muted">{grantReasonLabel(info)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Thư viện đã được cấp quyền ({grantedLibraryInfos.length})
        </h2>
        {grantedLibraryInfos.length === 0 ? (
          <p className="text-sm text-muted">Học viên chưa được cấp quyền tài liệu thư viện nào.</p>
        ) : (
          <ul className="space-y-2">
            {grantedLibraryInfos.map((info) => (
              <li
                key={info.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <Link href={`/admin/library/${info.id}`} className="text-foreground hover:text-primary">
                  {info.title}
                </Link>
                <span className="text-xs text-muted">{grantReasonLabel(info)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isHocVien && (
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
      )}

      {isHocVien && (
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
      )}

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
