"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level } from "@prisma/client";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseYoutubeId } from "@/lib/youtube";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
  order: z.coerce.number().int().default(0),
});

export async function createCourseAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: parsed.data.order,
    },
  });

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}`);
}

const updateCourseSchema = courseSchema.extend({
  courseId: z.string().min(1),
});

export async function updateCourseAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { courseId } = parsed.data;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: parsed.data.order,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

// No redirect — the caller (course list page) just refreshes in place.
export async function deleteCourseAction(courseId: string) {
  await requireActiveSuperAdmin();
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/admin/courses");
}

function resolveYoutubeId(raw: string | undefined): string | null | "invalid" {
  if (!raw) return null;
  const id = parseYoutubeId(raw);
  return id ?? "invalid";
}

const courseLessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  content: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  order: z.coerce.number().int().default(0),
});

export async function createCourseLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = courseLessonSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    youtube: formData.get("youtube") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") {
    return "Link YouTube không hợp lệ.";
  }

  const { courseId } = parsed.data;

  await prisma.courseLesson.create({
    data: {
      courseId,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      youtubeId,
      order: parsed.data.order,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

const updateCourseLessonSchema = courseLessonSchema.extend({
  lessonId: z.string().min(1),
});

export async function updateCourseLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = updateCourseLessonSchema.safeParse({
    lessonId: formData.get("lessonId"),
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    youtube: formData.get("youtube") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") {
    return "Link YouTube không hợp lệ.";
  }

  const { lessonId, courseId } = parsed.data;

  await prisma.courseLesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      youtubeId,
      order: parsed.data.order,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

// No redirect — callers differ on where they want to end up afterward.
export async function deleteCourseLessonAction(lessonId: string, courseId: string) {
  await requireActiveSuperAdmin();
  await prisma.courseLesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function grantCourseAccessAction(courseId: string, studentId: string) {
  const admin = await requireActiveSuperAdmin();
  if (!studentId) {
    return;
  }

  await prisma.courseAccessGrant.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: { studentId, courseId, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function revokeCourseAccessAction(grantId: string, courseId: string) {
  await requireActiveSuperAdmin();
  await prisma.courseAccessGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function grantCourseLevelAccessAction(courseId: string, minLevel: Level) {
  const admin = await requireActiveSuperAdmin();
  await prisma.courseLevelGrant.upsert({
    where: { courseId_minLevel: { courseId, minLevel } },
    create: { courseId, minLevel, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function revokeCourseLevelAccessAction(grantId: string, courseId: string) {
  await requireActiveSuperAdmin();
  await prisma.courseLevelGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/courses/${courseId}`);
}
