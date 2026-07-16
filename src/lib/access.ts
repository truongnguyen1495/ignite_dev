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

// A "no cấp" student (grantedLevel null — a self-registered account not yet
// admitted into the 5-level system) is restricted to exclusive
// courses/library/announcements/profile and the join-request page at
// /dashboard/level-up. Every level-ladder area (dashboard home,
// lessons/quizzes, chat) requires a real grantedLevel, enforced here as the
// single choke point so those areas don't need their own null checks.
export async function requireLeveledStudent(): Promise<User & { grantedLevel: Level }> {
  const student = await requireActiveStudent();
  if (student.grantedLevel === null) {
    redirect("/dashboard/home");
  }
  return student as User & { grantedLevel: Level };
}

export async function requireActiveSuperAdmin(): Promise<User> {
  return requireRole("SUPER_ADMIN");
}

// SUPER_ADMIN and an Admin Manager (a STUDENT designated by a Super Admin —
// see User.isAdminManager in schema.prisma) hold the exact same content
// permissions, short-circuiting the AdminPermission table the same way.
// The two things Admin Manager does NOT get are /admin/settings
// (requireActiveSuperAdmin gates that directly) and /admin/admins (gated
// separately below by requireAdminManagementAccess, since that needs its own
// canManageAdmins grant on top of isAdminManager).
export function hasFullAdminAccess(user: User): boolean {
  return user.role === "SUPER_ADMIN" || user.isAdminManager;
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
  const rows = await prisma.adminPermission.findMany({
    where: { userId, revokedAt: null },
    select: { permission: true },
  });
  return new Set(rows.map((r) => r.permission));
});

// Gate for an individual admin page/action scoped to one feature area.
// SUPER_ADMIN (and an Admin Manager — see hasFullAdminAccess) always passes,
// regardless of the AdminPermission table — that table only ever describes
// a STUDENT's limited slice of /admin.
export async function requireAdminPermission(permission: AdminPermissionKind): Promise<User> {
  const user = await requireActiveUser();
  if (hasFullAdminAccess(user)) {
    return user;
  }
  const permissions = await getAdminPermissions(user.id);
  if (!permissions.has(permission)) {
    redirect("/admin?denied=1");
  }
  return user;
}

// Same as requireAdminPermission, but passes if the admin holds any one of
// several permissions — used by shared plumbing (the student detail/edit
// page and its create/update/lock/delete actions) that both MANAGE_STUDENTS
// ("Học viên") and MANAGE_PROSPECTIVE_STUDENTS ("Học sinh") admins need,
// even though their list pages and request-review queues stay strictly
// separate.
export async function requireAnyAdminPermission(permissions: AdminPermissionKind[]): Promise<User> {
  const user = await requireActiveUser();
  if (hasFullAdminAccess(user)) {
    return user;
  }
  const granted = await getAdminPermissions(user.id);
  if (!permissions.some((permission) => granted.has(permission))) {
    redirect("/admin?denied=1");
  }
  return user;
}

// Non-redirecting check for a page that's already gated by one permission
// (e.g. MANAGE_COURSES) but needs to know, in addition, whether the caller
// also holds a second one (e.g. MANAGE_ORDERS) — to conditionally show/edit
// a sub-section rather than denying the whole page. `user` must come from a
// prior requireAdminPermission/requireRole call on this same request so the
// SUPER_ADMIN short-circuit and DB lookup stay consistent with that gate.
export async function hasAdminPermission(user: User, permission: AdminPermissionKind): Promise<boolean> {
  if (hasFullAdminAccess(user)) {
    return true;
  }
  const permissions = await getAdminPermissions(user.id);
  return permissions.has(permission);
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
  isAdminManager: boolean;
  canManageAdmins: boolean;
  permissions: Set<AdminPermissionKind>;
}> {
  const user = await requireActiveUser();
  if (user.role === "SUPER_ADMIN") {
    return { user, isSuperAdmin: true, isAdminManager: false, canManageAdmins: false, permissions: new Set() };
  }
  if (user.isAdminManager) {
    return {
      user,
      isSuperAdmin: false,
      isAdminManager: true,
      canManageAdmins: user.canManageAdmins,
      permissions: new Set(),
    };
  }
  const permissions = await getAdminPermissions(user.id);
  if (permissions.size === 0 && !user.adminOnly) {
    redirect("/dashboard");
  }
  return { user, isSuperAdmin: false, isAdminManager: false, canManageAdmins: false, permissions };
}

// Gate for /admin/admins specifically (creating admin accounts, granting/
// revoking their AdminPermission rows) — narrower than requireAnyAdminAccess
// on purpose: an Admin Manager's isAdminManager flag alone is NOT enough
// here, since "manage other admins" is a separate, explicitly-grantable
// capability (canManageAdmins) per Super Admin's decision, same spirit as
// DEMOTE_STUDENTS being separate from plain MANAGE_STUDENTS above.
export async function requireAdminManagementAccess(): Promise<{ user: User; isSuperAdmin: boolean }> {
  const user = await requireActiveUser();
  if (user.role === "SUPER_ADMIN") {
    return { user, isSuperAdmin: true };
  }
  if (user.isAdminManager && user.canManageAdmins) {
    return { user, isSuperAdmin: false };
  }
  redirect("/admin?denied=1");
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

// Master kill switch for public self-registration at /register, toggled from
// /admin/settings — same fresh-from-DB convention as isChatEnabled.
export async function isRegistrationEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.registrationEnabled ?? true;
}

// Master switch for the bilingual UI, toggled from /admin/settings — same
// fresh-from-DB convention as isChatEnabled. When off, src/lib/i18n/get-locale.ts
// always resolves "vi" regardless of a visitor's saved language cookie, and
// the language switcher renders nothing.
export async function isBilingualEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.bilingualEnabled ?? false;
}

// Master kill switch for the whole sales feature, toggled from
// /admin/settings — defaults off (bank info starts empty). When off, this
// hides the "Mua ngay" button, both nav entries ("Đơn hàng của tôi" /
// "Đơn hàng"), and blocks /dashboard/orders* and /admin/orders outright
// (see requireSalesEnabled below) — by explicit user request, even for
// admins, so a pending order left over from before the toggle was flipped
// off can't be confirmed/cancelled until sales are turned back on.
export async function isSalesEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.salesEnabled ?? false;
}

export async function requireSalesEnabled(redirectTo: string): Promise<void> {
  if (!(await isSalesEnabled())) {
    redirect(redirectTo);
  }
}

export async function requireLevelAccess(requestedLevel: Level): Promise<User> {
  const student = await requireLeveledStudent();
  if (!hasLevelAccess(student.grantedLevel, requestedLevel)) {
    redirect("/dashboard?denied=1");
  }
  return student;
}

export async function requireLessonAccess(lessonId: string) {
  const student = await requireLeveledStudent();
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
  const student = await requireLeveledStudent();
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
//
// "trial" is a third tier for anyone who isn't "full" yet — a course not
// hidden from anonymous guests (!hiddenFromGuest) is at least as open to any
// signed-in student, học viên or học sinh, as it is to a guest: only the
// same subset of lessons a guest gets (CourseLesson.visibleToGuest), not the
// whole course. A student only reaches "full" once explicitly granted, same
// as anyone else — via CourseAccessGrant, a level rule, or
// openToProspectiveStudents for học sinh specifically.
export type CourseAccessLevel = "none" | "trial" | "full";

export async function getCourseAccessLevel(student: User, courseId: string): Promise<CourseAccessLevel> {
  const [grant, levelGrants, course] = await Promise.all([
    prisma.courseAccessGrant.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    }),
    prisma.courseLevelGrant.findMany({ where: { courseId } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { openToProspectiveStudents: true, hiddenFromGuest: true, isFree: true },
    }),
  ]);
  // isFree is a blanket "everyone gets full access" switch, checked before
  // any grant/level logic — distinct from price = 0 ("không bán", still
  // admin-grant-only).
  if (course?.isFree) return "full";
  if (grant) return "full";
  const isFullViaLevel =
    student.grantedLevel === null
      ? (course?.openToProspectiveStudents ?? false)
      : levelGrants.some((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel));
  if (isFullViaLevel) return "full";
  if (course && !course.hiddenFromGuest) return "trial";
  return "none";
}

export async function requireCourseAccess(courseId: string) {
  const student = await requireActiveStudent();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    redirect("/dashboard?denied=1");
  }
  const accessLevel = await getCourseAccessLevel(student, courseId);
  if (accessLevel === "none") {
    redirect("/dashboard?denied=1");
  }
  return { student, course, accessLevel };
}

export async function requireCourseLessonAccess(lessonId: string) {
  const student = await requireActiveStudent();
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    redirect("/dashboard?denied=1");
  }
  const accessLevel = await getCourseAccessLevel(student, lesson.courseId);
  if (accessLevel === "none" || (accessLevel === "trial" && !lesson.visibleToGuest)) {
    redirect("/dashboard?denied=1");
  }
  return { student, lesson, accessLevel };
}

// Library items (books/documents) use the exact same grant model as
// courses — a direct per-student grant OR a "Level >= minLevel" rule, plus
// the same "trial" tier: an item open to anonymous guests (visibleToGuest +
// an actual previewFilePath) is at least as open to any signed-in student,
// học viên or học sinh, as it is to a guest — same truncated preview PDF,
// not the full file. Mirrors getCourseAccessLevel exactly.
export type LibraryAccessLevel = "none" | "trial" | "full";

export async function getLibraryItemAccessLevel(
  student: User,
  libraryItemId: string
): Promise<LibraryAccessLevel> {
  const [grant, levelGrants, libraryItem] = await Promise.all([
    prisma.libraryAccessGrant.findUnique({
      where: { studentId_libraryItemId: { studentId: student.id, libraryItemId } },
    }),
    prisma.libraryLevelGrant.findMany({ where: { libraryItemId } }),
    prisma.libraryItem.findUnique({
      where: { id: libraryItemId },
      select: {
        openToProspectiveStudents: true,
        isFree: true,
        visibleToGuest: true,
        previewFilePath: true,
        format: true,
        guestPreviewPages: true,
      },
    }),
  ]);
  // isFree is a blanket "everyone gets full access" switch, same convention
  // as Course.isFree — checked before any grant/level logic.
  if (libraryItem?.isFree) return "full";
  if (grant) return "full";
  const isFullViaLevel =
    student.grantedLevel === null
      ? (libraryItem?.openToProspectiveStudents ?? false)
      : levelGrants.some((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel));
  if (isFullViaLevel) return "full";
  // PDF trial reads previewFilePath (a physically truncated copy);
  // INTERACTIVE trial has no separate asset — /api/library/[itemId]/pages
  // slices to guestPreviewPages rows at query time instead.
  const hasTrialContent =
    libraryItem?.format === "INTERACTIVE"
      ? (libraryItem.guestPreviewPages ?? 0) > 0
      : !!libraryItem?.previewFilePath;
  if (libraryItem?.visibleToGuest && hasTrialContent) return "trial";
  return "none";
}

// Exported (unlike studentHasCourseAccess) because /api/library/[itemId]/file
// needs this same check outside of the redirect-based helpers below — it
// serves raw PDF bytes to an <iframe>, so it needs a JSON/plain error
// response instead of a redirect on failure. Deliberately "full" only —
// "trial" access reads the preview file via /api/library/[itemId]/preview
// instead, never this route.
export async function studentHasLibraryItemAccess(student: User, libraryItemId: string): Promise<boolean> {
  return (await getLibraryItemAccessLevel(student, libraryItemId)) === "full";
}

export async function requireLibraryItemAccess(libraryItemId: string) {
  const student = await requireActiveStudent();
  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  if (!libraryItem || !libraryItem.visibleToStudents) {
    redirect("/dashboard/library?denied=1");
  }
  const accessLevel = await getLibraryItemAccessLevel(student, libraryItemId);
  if (accessLevel === "none") {
    redirect("/dashboard/library?denied=1");
  }
  return { student, libraryItem, accessLevel };
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
  if (!course || course.hiddenFromGuest) {
    redirect("/guest/courses?denied=1");
  }
  return { course };
}

// A lesson needs BOTH: the parent course isn't hidden from guests, and the
// lesson itself is opted into visibleToGuest — the course-level flag alone
// isn't enough. This is how an admin exposes a course to guests while still
// holding back specific lessons (e.g. ones gated behind payment that
// doesn't exist yet), independent of any student-facing access rule.
//
// A free course (Course.isFree) is the one exception to the per-lesson
// visibleToGuest gate: "Miễn phí" means every lesson opens for guests too,
// same as it does for học viên/học sinh (getCourseAccessLevel above) —
// hiddenFromGuest still applies, since that's the separate "don't show this
// course to guests at all" switch, not overridden by isFree.
export async function requireGuestCourseLessonAccess(lessonId: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson || lesson.course.hiddenFromGuest) {
    redirect("/guest/courses?denied=1");
  }
  if (!lesson.course.isFree && !lesson.visibleToGuest) {
    redirect("/guest/courses?denied=1");
  }
  return { lesson };
}

// Guests normally only ever get the truncated preview, never
// libraryItem.filePath — this gate exists purely to decide whether that
// preview can be shown at all, so it also requires a previewFilePath to
// actually exist. A free item (LibraryItem.isFree) is the one exception:
// "Miễn phí" means guests read the full file/pages too (see the isFree
// branches in /api/library/[itemId]/file and /pages), so no trial content
// needs to exist for them to pass this gate — visibleToGuest still applies,
// same "is this even in the guest area" switch as always.
export async function requireGuestLibraryItemAccess(libraryItemId: string) {
  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  if (!libraryItem || !libraryItem.visibleToGuest || !libraryItem.visibleToStudents) {
    redirect("/guest/library?denied=1");
  }
  // visibleToStudents doubles as a master hide switch here too: an item
  // hidden from students is hidden from guests too, regardless of
  // visibleToGuest — same convention as requireGuestAnnouncementAccess.
  // Trial content check is format-aware, same rule as getLibraryItemAccessLevel
  // above: PDF needs previewFilePath, INTERACTIVE just needs guestPreviewPages set.
  const hasTrialContent =
    libraryItem.format === "INTERACTIVE"
      ? (libraryItem.guestPreviewPages ?? 0) > 0
      : !!libraryItem.previewFilePath;
  if (!libraryItem.isFree && !hasTrialContent) {
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
  const student = await requireLeveledStudent();
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
  const student = await requireLeveledStudent();
  await requireChatEnabled("/dashboard");
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.kind !== "DIRECT" || !userCanAccessChatThread(student, thread)) {
    redirect("/dashboard/chat?denied=1");
  }
  return { student, thread };
}

export async function requireGroupThreadAccess(level: Level) {
  const student = await requireLeveledStudent();
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
