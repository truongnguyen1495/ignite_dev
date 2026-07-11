import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AdminPermissionKind, ChatThread, Level, Role, User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { getOrCreateSupportThread } from "@/lib/chat";

export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

// Identifies *who* the caller is from the (possibly stale) session JWT.
// Every function below re-fetches status/role/grantedLevel fresh from the
// DB before making an authorization decision — the JWT is never trusted for
// that, only for the user id.
//
// Both requireSession and requireRole are wrapped in React's cache() so that
// a layout and its page (which each independently call these, since a page
// can't assume its own layout already checked) share one DB round trip per
// request instead of two — this matters a lot on Vercel, where every extra
// round trip to the DB adds real cross-region latency. cache() is scoped to
// a single request, so the "always fresh from DB" guarantee is unaffected.
export const requireSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
});

export const requireRole = cache(async (role: Role): Promise<User> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  // An invalid or locked account is never redirected based on the requested
  // role — that would bounce a just-locked student between /dashboard and
  // /admin forever, since it can never satisfy either section's gate. Force
  // re-authentication instead; login itself already rejects locked accounts.
  if (!user || user.status !== "ACTIVE") {
    redirect("/login");
  }

  if (user.role !== role) {
    redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
  }

  return user;
});

export async function requireActiveStudent(): Promise<User> {
  const user = await requireRole("STUDENT");
  // adminOnly accounts are STUDENT in role only (see the User model comment)
  // — they never get to act as a student, so /dashboard bounces them to
  // /admin instead of the usual mismatched-role destination.
  if (user.adminOnly) {
    redirect("/admin");
  }
  return user;
}

export async function requireActiveSuperAdmin(): Promise<User> {
  return requireRole("SUPER_ADMIN");
}

// Same "fresh from DB, cached per request" shape as requireRole, but without
// pinning a role — used by the permission helpers below, which need to
// branch on role themselves rather than being redirected away by requireRole.
const requireActiveUser = cache(async (): Promise<User> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    redirect("/login");
  }
  return user;
});

// A STUDENT account can additionally hold specific admin permissions
// (granted from /admin/settings, Super Admin only) without losing its
// STUDENT role — this is what lets one account be "both a student and a
// limited admin" rather than needing a third Role enum value. Cached per
// request since both requireAnyAdminAccess (layout) and requireAdminPermission
// (individual pages/actions) look this up on the same request.
export const getAdminPermissions = cache(async (userId: string): Promise<Set<AdminPermissionKind>> => {
  const rows = await prisma.adminPermission.findMany({ where: { userId }, select: { permission: true } });
  return new Set(rows.map((r) => r.permission));
});

// Gate for an individual admin page/action scoped to one feature area.
// SUPER_ADMIN always passes, regardless of the AdminPermission table — that
// table only ever describes a STUDENT's limited slice of /admin.
export async function requireAdminPermission(permission: AdminPermissionKind): Promise<User> {
  const user = await requireActiveUser();
  if (user.role === "SUPER_ADMIN") {
    return user;
  }
  const permissions = await getAdminPermissions(user.id);
  if (!permissions.has(permission)) {
    redirect("/admin?denied=1");
  }
  return user;
}

// Gate for the /admin layout itself: lets in a SUPER_ADMIN (full access) or
// a STUDENT holding at least one admin permission (dual-role admin) —
// anyone else (a plain student with zero permissions) is bounced back to
// /dashboard. Returns the granted permission set so the layout can filter
// its nav accordingly.
//
// adminOnly accounts are the one exception to the "redirect to /dashboard"
// fallback: requireActiveStudent already blocks them from /dashboard, so
// bouncing them there on zero permissions would just loop. This only
// happens if a Super Admin creates one and revokes every permission without
// granting new ones — they land on a nearly-empty /admin (just "Tổng quan")
// instead, which is odd but not broken.
export async function requireAnyAdminAccess(): Promise<{
  user: User;
  isSuperAdmin: boolean;
  permissions: Set<AdminPermissionKind>;
}> {
  const user = await requireActiveUser();
  if (user.role === "SUPER_ADMIN") {
    return { user, isSuperAdmin: true, permissions: new Set() };
  }
  const permissions = await getAdminPermissions(user.id);
  if (permissions.size === 0 && !user.adminOnly) {
    redirect("/dashboard");
  }
  return { user, isSuperAdmin: false, permissions };
}

// Master kill switch for the whole chat feature, toggled from
// /admin/settings. Checked fresh from the DB (same convention as every
// other guard in this file) rather than cached, so flipping it off takes
// effect on the very next request.
export async function isChatEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.chatEnabled ?? true;
}

export async function requireChatEnabled(redirectTo: string): Promise<void> {
  if (!(await isChatEnabled())) {
    redirect(redirectTo);
  }
}

export async function requireLevelAccess(requestedLevel: Level): Promise<User> {
  const student = await requireActiveStudent();
  if (!hasLevelAccess(student.grantedLevel, requestedLevel)) {
    redirect("/dashboard?denied=1");
  }
  return student;
}

export async function requireLessonAccess(lessonId: string) {
  const student = await requireActiveStudent();
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    redirect("/dashboard?denied=1");
  }
  if (!hasLevelAccess(student.grantedLevel, lesson.level)) {
    redirect("/dashboard?denied=1");
  }
  return { student, lesson };
}

export async function requireQuizAccess(quizId: string) {
  const student = await requireActiveStudent();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: true },
  });
  if (!quiz) {
    redirect("/dashboard?denied=1");
  }
  if (!hasLevelAccess(student.grantedLevel, quiz.lesson.level)) {
    redirect("/dashboard?denied=1");
  }
  return { student, quiz };
}

// Exclusive courses aren't gated by grantedLevel by default — access is
// either a per-student grant row (CourseAccessGrant) or a continuous
// "Level >= minLevel" rule (CourseLevelGrant), checked fresh from the DB
// same as everything else in this file. Either one is sufficient; a student
// who levels up into a rule's threshold gains access immediately, with no
// backfill, since this is re-evaluated on every visit.
async function studentHasCourseAccess(student: User, courseId: string): Promise<boolean> {
  const [grant, levelGrants] = await Promise.all([
    prisma.courseAccessGrant.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    }),
    prisma.courseLevelGrant.findMany({ where: { courseId } }),
  ]);
  if (grant) return true;
  return levelGrants.some((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel));
}

export async function requireCourseAccess(courseId: string) {
  const student = await requireActiveStudent();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    redirect("/dashboard?denied=1");
  }
  if (!(await studentHasCourseAccess(student, courseId))) {
    redirect("/dashboard?denied=1");
  }
  return { student, course };
}

export async function requireCourseLessonAccess(lessonId: string) {
  const student = await requireActiveStudent();
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    redirect("/dashboard?denied=1");
  }
  if (!(await studentHasCourseAccess(student, lesson.courseId))) {
    redirect("/dashboard?denied=1");
  }
  return { student, lesson };
}

// Library items (books/documents) use the exact same grant model as
// courses — a direct per-student grant OR a "Level >= minLevel" rule.
// Exported (unlike studentHasCourseAccess) because /api/library/[itemId]/file
// needs this same check outside of the redirect-based helpers below — it
// serves raw PDF bytes to an <iframe>, so it needs a JSON/plain error
// response instead of a redirect on failure.
export async function studentHasLibraryItemAccess(student: User, libraryItemId: string): Promise<boolean> {
  const [grant, levelGrants] = await Promise.all([
    prisma.libraryAccessGrant.findUnique({
      where: { studentId_libraryItemId: { studentId: student.id, libraryItemId } },
    }),
    prisma.libraryLevelGrant.findMany({ where: { libraryItemId } }),
  ]);
  if (grant) return true;
  return levelGrants.some((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel));
}

export async function requireLibraryItemAccess(libraryItemId: string) {
  const student = await requireActiveStudent();
  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  if (!libraryItem || !libraryItem.visibleToStudents) {
    redirect("/dashboard/library?denied=1");
  }
  if (!(await studentHasLibraryItemAccess(student, libraryItemId))) {
    redirect("/dashboard/library?denied=1");
  }
  return { student, libraryItem };
}

export async function requireAnnouncementAccess(announcementId: string) {
  const student = await requireActiveStudent();
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || !announcement.visibleToStudents) {
    redirect("/dashboard/announcements?denied=1");
  }
  if (announcement.minLevel && !hasLevelAccess(student.grantedLevel, announcement.minLevel)) {
    redirect("/dashboard/announcements?denied=1");
  }
  return { student, announcement };
}

// Guest-facing access — deliberately does NOT call requireSession/requireActiveStudent.
// These back the public /guest/* routes: no login, no grantedLevel, just a single
// admin-set flag per item. Anything not explicitly opted in (visibleToGuest: false,
// the default) is invisible here regardless of its minLevel/course grants.
export async function requireGuestAnnouncementAccess(announcementId: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  // visibleToStudents doubles as a master hide switch here: an announcement
  // hidden from students is hidden from guests too, regardless of
  // visibleToGuest — guests never see anything a student can't.
  if (!announcement || !announcement.visibleToGuest || !announcement.visibleToStudents) {
    redirect("/guest/announcements?denied=1");
  }
  return { announcement };
}

export async function requireGuestCourseAccess(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.visibleToGuest) {
    redirect("/guest/courses?denied=1");
  }
  return { course };
}

// A lesson needs BOTH flags: the parent course opted into guest access, and
// the lesson itself is opted in too — the course-level flag alone isn't
// enough. This is how an admin exposes a course to guests while still
// holding back specific lessons (e.g. ones gated behind payment that
// doesn't exist yet), independent of any student-facing access rule.
export async function requireGuestCourseLessonAccess(lessonId: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson || !lesson.course.visibleToGuest || !lesson.visibleToGuest) {
    redirect("/guest/courses?denied=1");
  }
  return { lesson };
}

// Guests only ever get the truncated preview, never libraryItem.filePath —
// this gate exists purely to decide whether that preview can be shown at
// all, so it also requires a previewFilePath to actually exist.
export async function requireGuestLibraryItemAccess(libraryItemId: string) {
  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  // visibleToStudents doubles as a master hide switch here too: an item
  // hidden from students is hidden from guests too, regardless of
  // visibleToGuest — same convention as requireGuestAnnouncementAccess.
  if (
    !libraryItem ||
    !libraryItem.visibleToGuest ||
    !libraryItem.previewFilePath ||
    !libraryItem.visibleToStudents
  ) {
    redirect("/guest/library?denied=1");
  }
  return { libraryItem };
}

// Central rule for all three chat kinds — reused by every page-level guard
// below AND by the attachment-download route handler (same split as
// studentHasLibraryItemAccess / requireLibraryItemAccess: redirect-based
// helpers for pages, a plain boolean check for JSON-responding routes).
// hasChatAdminPermission covers a STUDENT dual-role admin holding
// MANAGE_CHAT — kept as a plain boolean the caller passes in (rather than
// looking it up here) so this stays a sync function usable in the download
// route's boolean check; only that route currently needs to pass it (see
// getAdminPermissions in this file).
export function userCanAccessChatThread(
  user: User,
  thread: ChatThread,
  hasChatAdminPermission = false
): boolean {
  const isAdmin = user.role === "SUPER_ADMIN" || hasChatAdminPermission;
  switch (thread.kind) {
    case "SUPPORT":
      return isAdmin || user.id === thread.supportStudentId;
    case "DIRECT":
      return user.id === thread.directUserAId || user.id === thread.directUserBId;
    case "GROUP":
      // Same >= rule as hasLevelAccess uses for content gating: a student
      // sees their own room plus every room below it, not just an exact
      // match. Admins see every group room regardless of level.
      return (
        isAdmin ||
        (user.role === "STUDENT" && !!thread.groupLevel && hasLevelAccess(user.grantedLevel, thread.groupLevel))
      );
  }
}

export async function requireOwnSupportThreadAccess() {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  const thread = await getOrCreateSupportThread(student.id);
  return { student, thread };
}

export async function requireAdminSupportThreadAccess(threadId: string) {
  const admin = await requireAdminPermission("MANAGE_CHAT");
  await requireChatEnabled("/admin");
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.kind !== "SUPPORT") {
    redirect("/admin/chat?denied=1");
  }
  // No ownership check beyond kind — any active admin may view/reply to any
  // support thread, per the confirmed requirement (no per-admin assignment).
  return { admin, thread };
}

export async function requireDirectThreadAccess(threadId: string) {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.kind !== "DIRECT" || !userCanAccessChatThread(student, thread)) {
    redirect("/dashboard/chat?denied=1");
  }
  return { student, thread };
}

export async function requireGroupThreadAccess(level: Level) {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  if (!hasLevelAccess(student.grantedLevel, level)) {
    redirect("/dashboard/chat?denied=1");
  }
  return { student, level };
}

// Admins reach group rooms through a separate /admin/chat/group/[level]
// route (dashboard/layout.tsx's requireActiveStudent() would bounce them out
// of every /dashboard/* route before they ever got here) — every level is
// open to every admin, no restriction.
export async function requireAdminGroupThreadAccess(level: Level) {
  const admin = await requireAdminPermission("MANAGE_CHAT");
  await requireChatEnabled("/admin");
  return { admin, level };
}
