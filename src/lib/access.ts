import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AdminPermissionKind, ChatThread, Level, Role, User, Whiteboard, WhiteboardAccessRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { announcementVisibleTo } from "@/lib/announcements";
import { getOrCreateSupportThread } from "@/lib/chat";
import { credentialFingerprint } from "@/lib/session-fingerprint";

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

// Whether this session was issued against the password the account still has.
//
// Costs nothing extra: every caller has already loaded the User row for its
// own status/role check, so this is a string comparison, not a query. A token
// with no stamp predates the feature and is allowed through — see the comment
// in src/types/next-auth.d.ts for why that grandfathering is safe.
function sessionMatchesCredential(
  session: { user: { credentialFingerprint?: string } },
  user: User
): boolean {
  const stamped = session.user.credentialFingerprint;
  if (!stamped) return true;
  return stamped === credentialFingerprint(user.passwordHash);
}

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

  // The password changed after this token was handed out — whoever is holding
  // it is not who the account belongs to any more, or at least the owner has
  // decided they shouldn't be.
  if (!sessionMatchesCredential(session, user)) {
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

// Non-redirecting counterpart to requireActiveStudent, for pages that must
// render for anonymous guests too (public product landing pages) but still
// want to show student-only chrome (the floating cart icon) when a real
// session happens to exist. Never call this to gate an actual mutation or
// level-restricted read — every write path must keep using a require*
// function so the "always redirect on failure" guarantee holds.
export async function getActiveStudentOrNull(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE" || user.role !== "STUDENT" || user.adminOnly) return null;
  if (!sessionMatchesCredential(session, user)) return null;
  return user;
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
// Exported (unlike a purely internal helper) because it's also the exact
// gate wanted for "any active logged-in account, either role" call sites
// that have nothing to do with admin permissions — e.g. the whiteboard
// upload routes (/api/admin/upload-whiteboard-image, -video) and gate #1 of
// reaching /admin/whiteboards or /dashboard/whiteboards, both of which only
// need a valid, active session, never a specific AdminPermissionKind.
export const requireAnyActiveAccount = cache(async (): Promise<User> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE" || !sessionMatchesCredential(session, user)) {
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
  const user = await requireAnyActiveAccount();
  if (hasFullAdminAccess(user)) {
    return user;
  }
  const permissions = await getAdminPermissions(user.id);
  if (!permissions.has(permission)) {
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
  const user = await requireAnyActiveAccount();
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
// capability (canManageAdmins) per Super Admin's decision.
export async function requireAdminManagementAccess(): Promise<{ user: User; isSuperAdmin: boolean }> {
  const user = await requireAnyActiveAccount();
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

// Single global master switch for the whole "Bảng vẽ" whiteboard feature,
// toggled from /admin/settings (Super Admin only) — same fresh-from-DB
// convention as isChatEnabled. Deliberately NOT split by audience the way
// most other toggles in this file are: off makes the feature unreachable
// for literally everyone, Super Admin included; on opens it to all 3
// non-guest audiences (Super Admin, Admin, thành viên) at once, subject to
// each board's own per-board sharing (see requireWhiteboardAccess below).
export async function isWhiteboardsEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.whiteboardsEnabled ?? false;
}

export async function requireWhiteboardsEnabled(redirectTo: string): Promise<void> {
  if (!(await isWhiteboardsEnabled())) {
    redirect(redirectTo);
  }
}

// Master kill switch for public self-registration at /register, toggled from
// /admin/settings — same fresh-from-DB convention as isChatEnabled.
export async function isRegistrationEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.registrationEnabled ?? true;
}

// Master switch for requiring email verification before login, toggled from
// /admin/settings — same fresh-from-DB convention as isChatEnabled. When
// off, src/lib/auth.ts's authorize() never checks User.emailVerified.
export async function isEmailVerificationEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.emailVerificationEnabled ?? false;
}

// Master switch for the "Đăng nhập bằng Google" button/flow, toggled from
// /admin/settings — same fresh-from-DB convention as isChatEnabled.
export async function isGoogleLoginEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.googleLoginEnabled ?? false;
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

// Master switch for SePay webhook auto-confirmation, toggled from
// /admin/settings. Read fresh at the moment the webhook processes each
// transaction (src/app/api/webhooks/sepay/route.ts) — not cached, not
// snapshotted onto the Order — so flipping this off takes effect
// immediately, even for orders created while it was on. When false, the
// webhook route still accepts SePay's requests (so nothing needs
// reconfiguring on SePay's side) but never calls fulfillOrder; admins fall
// back to the pre-existing manual confirmOrderPaidAction, which stays
// available regardless of this switch.
export async function isAutoPaymentEnabled(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.autoPaymentEnabled ?? false;
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
//
// "trial" is a third tier for anyone who isn't "full" yet — a course not
// hidden from anonymous guests (!hiddenFromGuest) is at least as open to any
// signed-in student as it is to a guest: only the same subset of lessons a
// guest gets (CourseLesson.visibleToGuest), not the whole course. A student
// only reaches "full" once explicitly granted, same as anyone else — via
// CourseAccessGrant or a level rule.
export type CourseAccessLevel = "none" | "trial" | "full";

// Batched sibling of getCourseAccessLevel below — 3 queries total regardless
// of courseIds.length, instead of 3 *per course*. Added after a real
// connection-pool timeout was reproduced on a featured-items teaser page
// (DATABASE_URL's connection_limit=1 couldn't keep up with getGuestCourseItems/
// getGuestLibraryItems firing one getCourseAccessLevel/getLibraryItemAccessLevel
// per featured item, each doing its own 3-query Promise.all, all concurrently).
// getCourseAccessLevel itself is now a thin single-id wrapper around this, so
// the access-level business rule only lives in one place.
export async function getCourseAccessLevels(
  student: User,
  courseIds: string[]
): Promise<Map<string, CourseAccessLevel>> {
  if (courseIds.length === 0) return new Map();

  const [grants, levelGrants, courses] = await Promise.all([
    prisma.courseAccessGrant.findMany({ where: { studentId: student.id, courseId: { in: courseIds } } }),
    prisma.courseLevelGrant.findMany({ where: { courseId: { in: courseIds } } }),
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, hiddenFromGuest: true, isFree: true },
    }),
  ]);

  const grantedCourseIds = new Set(grants.map((g) => g.courseId));
  const levelGrantsByCourse = new Map<string, typeof levelGrants>();
  for (const lg of levelGrants) {
    const list = levelGrantsByCourse.get(lg.courseId);
    if (list) list.push(lg);
    else levelGrantsByCourse.set(lg.courseId, [lg]);
  }

  const result = new Map<string, CourseAccessLevel>();
  for (const course of courses) {
    // isFree is a blanket "everyone gets full access" switch, checked before
    // any grant/level logic — distinct from price = 0 ("không bán", still
    // admin-grant-only).
    if (course.isFree || grantedCourseIds.has(course.id)) {
      result.set(course.id, "full");
      continue;
    }
    const isFullViaLevel = (levelGrantsByCourse.get(course.id) ?? []).some((lg) =>
      hasLevelAccess(student.grantedLevel, lg.minLevel)
    );
    result.set(course.id, isFullViaLevel ? "full" : !course.hiddenFromGuest ? "trial" : "none");
  }
  return result;
}

export async function getCourseAccessLevel(student: User, courseId: string): Promise<CourseAccessLevel> {
  const levels = await getCourseAccessLevels(student, [courseId]);
  return levels.get(courseId) ?? "none";
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
// an actual previewFilePath) is at least as open to any signed-in student
// as it is to a guest — same truncated preview PDF, not the full file.
// Mirrors getCourseAccessLevel exactly.
export type LibraryAccessLevel = "none" | "trial" | "full";

// Batched sibling of getLibraryItemAccessLevel below — same reasoning as
// getCourseAccessLevels above (3 queries total instead of 3 per item).
export async function getLibraryItemAccessLevels(
  student: User,
  libraryItemIds: string[]
): Promise<Map<string, LibraryAccessLevel>> {
  if (libraryItemIds.length === 0) return new Map();

  const [grants, levelGrants, libraryItems] = await Promise.all([
    prisma.libraryAccessGrant.findMany({
      where: { studentId: student.id, libraryItemId: { in: libraryItemIds } },
    }),
    prisma.libraryLevelGrant.findMany({ where: { libraryItemId: { in: libraryItemIds } } }),
    prisma.libraryItem.findMany({
      where: { id: { in: libraryItemIds } },
      select: {
        id: true,
        isFree: true,
        visibleToGuest: true,
        previewFilePath: true,
        format: true,
        guestPreviewPages: true,
      },
    }),
  ]);

  const grantedItemIds = new Set(grants.map((g) => g.libraryItemId));
  const levelGrantsByItem = new Map<string, typeof levelGrants>();
  for (const lg of levelGrants) {
    const list = levelGrantsByItem.get(lg.libraryItemId);
    if (list) list.push(lg);
    else levelGrantsByItem.set(lg.libraryItemId, [lg]);
  }

  const result = new Map<string, LibraryAccessLevel>();
  for (const item of libraryItems) {
    // isFree is a blanket "everyone gets full access" switch, same convention
    // as Course.isFree — checked before any grant/level logic.
    if (item.isFree || grantedItemIds.has(item.id)) {
      result.set(item.id, "full");
      continue;
    }
    const isFullViaLevel = (levelGrantsByItem.get(item.id) ?? []).some((lg) =>
      hasLevelAccess(student.grantedLevel, lg.minLevel)
    );
    if (isFullViaLevel) {
      result.set(item.id, "full");
      continue;
    }
    // PDF trial reads previewFilePath (a physically truncated copy);
    // INTERACTIVE trial has no separate asset — /api/library/[itemId]/pages
    // slices to guestPreviewPages rows at query time instead.
    const hasTrialContent =
      item.format === "INTERACTIVE" ? (item.guestPreviewPages ?? 0) > 0 : !!item.previewFilePath;
    result.set(item.id, item.visibleToGuest && hasTrialContent ? "trial" : "none");
  }
  return result;
}

export async function getLibraryItemAccessLevel(
  student: User,
  libraryItemId: string
): Promise<LibraryAccessLevel> {
  const levels = await getLibraryItemAccessLevels(student, [libraryItemId]);
  return levels.get(libraryItemId) ?? "none";
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

// Products have no "trial" tier (unlike Course/LibraryItem) — a product page
// has no partial content to preview, so visibility is a plain boolean
// instead of a 3-tier CourseAccessLevel/LibraryAccessLevel. `student` is
// null for an anonymous khách; a product with hiddenFromGuest === false is
// visible to everyone (guest or student) without even touching the grant
// tables. Batched the same way as getCourseAccessLevels/
// getLibraryItemAccessLevels (one query per table, not per product) for the
// same connection-pool reason documented above them.
export async function getVisibleProductIds(
  student: User | null,
  productIds: string[]
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, hiddenFromGuest: true },
  });

  const visible = new Set(products.filter((p) => !p.hiddenFromGuest).map((p) => p.id));
  if (!student) return visible;

  const restrictedIds = products.filter((p) => p.hiddenFromGuest).map((p) => p.id);
  if (restrictedIds.length === 0) return visible;

  const [levelGrants, accessGrants] = await Promise.all([
    prisma.productLevelGrant.findMany({ where: { productId: { in: restrictedIds } } }),
    prisma.productAccessGrant.findMany({
      where: { productId: { in: restrictedIds }, studentId: student.id },
    }),
  ]);

  const grantedViaAccess = new Set(accessGrants.map((g) => g.productId));
  const levelGrantsByProduct = new Map<string, Level[]>();
  for (const lg of levelGrants) {
    const list = levelGrantsByProduct.get(lg.productId);
    if (list) list.push(lg.minLevel);
    else levelGrantsByProduct.set(lg.productId, [lg.minLevel]);
  }

  for (const id of restrictedIds) {
    if (grantedViaAccess.has(id)) {
      visible.add(id);
      continue;
    }
    const minLevels = levelGrantsByProduct.get(id) ?? [];
    if (minLevels.some((minLevel) => hasLevelAccess(student.grantedLevel, minLevel))) {
      visible.add(id);
    }
  }
  return visible;
}

export async function canViewProduct(student: User | null, productId: string): Promise<boolean> {
  const visible = await getVisibleProductIds(student, [productId]);
  return visible.has(productId);
}

export async function requireAnnouncementAccess(announcementId: string) {
  const student = await requireActiveStudent();
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (
    !announcement ||
    !announcement.visibleToStudents ||
    !announcementVisibleTo(announcement, student.grantedLevel)
  ) {
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
// same as it does for thành viên (getCourseAccessLevel above) — hiddenFromGuest
// still applies, since that's the separate "don't show this course to
// guests at all" switch, not overridden by isFree.
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

// "OWNER" covers both a real SUPER_ADMIN and the board's own creator — both
// imply full edit access AND the ability to manage sharing (see
// canManageWhiteboardSharing below). The WhiteboardAccessRole values cover
// an explicit per-person grant (WhiteboardCollaborator) or the board's
// generalAccessRole, which may be VIEWER/COMMENTER (read-only — see
// WhiteboardViewer) or EDITOR (full edit, but NOT sharing management).
export type WhiteboardResolvedRole = "OWNER" | WhiteboardAccessRole;

// The single choke point for opening ONE specific whiteboard — backs both
// the admin per-board route and the student per-board route, so the access
// rule only lives in one place. Returns null (not a redirect) if the board
// itself doesn't exist, so callers can render their own notFound() rather
// than this file needing to know each route's 404 UI; every actual ACCESS
// denial redirects to `deniedRedirect` instead, same convention as
// requireLibraryItemAccess/requireCourseAccess above.
//
// Rules, in order (deliberately simpler than Kian_project's reference
// implementation — see this app's Role enum, which has no separate ADMIN
// tier and no MANAGE_WHITEBOARDS permission, so there is no "admin team
// gets blanket access to admin-owned boards" step here: an Admin's own
// boards are exactly as private as a student's):
//  1. SUPER_ADMIN — always allowed, role "OWNER".
//  2. The board's owner (createdById) — always allowed, role "OWNER".
//  3. An explicit WhiteboardCollaborator row — grants that row's own role.
//  4. Otherwise, the board's generalAccessRole, if set — grants that role,
//     AND upserts a WhiteboardCollaborator row for this user at that role
//     (new behavior vs. Kian_project) so the board keeps showing up in this
//     user's own board list from then on even if general access is later
//     revoked, mirroring real Google Drive's "Shared with me."
//  5. Otherwise — redirect(deniedRedirect).
export async function requireWhiteboardAccess(
  boardId: string,
  deniedRedirect: string
): Promise<{ user: User; board: Whiteboard; role: WhiteboardResolvedRole } | null> {
  await requireWhiteboardsEnabled(deniedRedirect);

  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    redirect("/login");
  }

  const board = await prisma.whiteboard.findUnique({ where: { id: boardId } });
  if (!board) {
    return null;
  }

  if (user.role === "SUPER_ADMIN") {
    return { user, board, role: "OWNER" };
  }
  if (board.createdById === user.id) {
    return { user, board, role: "OWNER" };
  }

  const grant = await prisma.whiteboardCollaborator.findUnique({
    where: { whiteboardId_userId: { whiteboardId: boardId, userId: user.id } },
  });
  if (grant) {
    return { user, board, role: grant.role };
  }

  if (board.generalAccessRole) {
    await prisma.whiteboardCollaborator.upsert({
      where: { whiteboardId_userId: { whiteboardId: boardId, userId: user.id } },
      create: { whiteboardId: boardId, userId: user.id, role: board.generalAccessRole },
      update: {},
    });
    return { user, board, role: board.generalAccessRole };
  }

  redirect(deniedRedirect);
}

// Whether `user` may manage WHO ELSE can edit `board` — narrower than
// requireWhiteboardAccess's "can open this board at all": a collaborator,
// even an Editor, can edit content but not the share list itself, same as a
// Google Doc's can-edit vs can-share distinction. Only the true owner or a
// Super Admin may manage sharing.
export async function canManageWhiteboardSharing(
  user: User,
  board: { createdById: string | null }
): Promise<boolean> {
  return user.role === "SUPER_ADMIN" || board.createdById === user.id;
}

// Whether a resolved requireWhiteboardAccess role may mutate board content
// (save/rename/delete) — VIEWER/COMMENTER are read-only (see
// WhiteboardViewer), OWNER/EDITOR are not. A single named check so the
// admin and student action files don't each hardcode the same
// `role === "OWNER" || role === "EDITOR"` comparison.
export function canEditWhiteboard(role: WhiteboardResolvedRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}

// Gate for the read-only "Nhóm của tôi" area (/dashboard/my-group) — every
// active student may open it, membership is just null if they haven't been
// assigned to a group yet (rendered as an empty state, not a redirect).
export async function requireOwnGroupMembership() {
  const student = await requireActiveStudent();
  const membership = await prisma.groupMembership.findUnique({
    where: { userId: student.id },
    include: { group: true },
  });
  return { student, membership };
}

// Gate for the leader-only actions inside "Nhóm của tôi" (soạn nhiệm vụ,
// duyệt giải trình) — deliberately NOT an AdminPermission: every
// LEADER/DEPUTY needs this for their own group with zero admin setup, see
// GroupMembership.role in schema.prisma. A SUPER_ADMIN or an admin holding
// MANAGE_GROUPS reaches the same actions for ANY group through
// /admin/groups instead (requireAdminPermission("MANAGE_GROUPS")), not this.
export async function requireOwnGroupLeadership() {
  const student = await requireActiveStudent();
  const membership = await prisma.groupMembership.findUnique({
    where: { userId: student.id },
    include: { group: true },
  });
  if (!membership || (membership.role !== "LEADER" && membership.role !== "DEPUTY")) {
    redirect("/dashboard/my-group?denied=1");
  }
  return { student, membership };
}
