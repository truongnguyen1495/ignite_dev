import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Level, Role, User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";

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
  return requireRole("STUDENT");
}

export async function requireActiveSuperAdmin(): Promise<User> {
  return requireRole("SUPER_ADMIN");
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
