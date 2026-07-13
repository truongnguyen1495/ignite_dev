"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level } from "@prisma/client";
import { requireAdminPermission, hasAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseYoutubeId } from "@/lib/youtube";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
  order: z.coerce.number().int().default(0),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
});

// isFree/salePrice aren't part of the zod schema above (isFree is a plain
// checkbox, salePrice's validity depends on isFree) — validated here so
// both create/update share the same rule: a sale price only makes sense
// against a real giá gốc, and must actually be cheaper than it.
function resolvePricingFields(
  formData: FormData,
  price: number,
  salePrice: number | undefined
): { isFree: boolean; salePrice: number | null } | string {
  const isFree = formData.get("isFree") === "on";
  if (isFree || !salePrice) {
    return { isFree, salePrice: null };
  }
  if (salePrice >= price) {
    return "Giá khuyến mãi phải nhỏ hơn giá gốc.";
  }
  return { isFree, salePrice };
}

export async function createCourseAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_COURSES");
  const canManageOrders = await hasAdminPermission(admin, "MANAGE_ORDERS");

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  // An admin without "Đơn hàng" can't set pricing at all — a brand-new
  // course they create starts unsold (giá 0, không miễn phí) regardless of
  // what the request body claims, since the form hides these fields for them.
  let pricing: { price: number; salePrice: number | null; isFree: boolean };
  if (canManageOrders) {
    const resolved = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
    if (typeof resolved === "string") {
      return resolved;
    }
    pricing = { price: parsed.data.price, salePrice: resolved.salePrice, isFree: resolved.isFree };
  } else {
    pricing = { price: 0, salePrice: null, isFree: false };
  }

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: parsed.data.order,
      price: pricing.price,
      salePrice: pricing.salePrice,
      isFree: pricing.isFree,
      hiddenFromGuest: formData.get("hiddenFromGuest") === "on",
      featuredOnHome: formData.get("featuredOnHome") === "on",
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
  const admin = await requireAdminPermission("MANAGE_COURSES");
  const canManageOrders = await hasAdminPermission(admin, "MANAGE_ORDERS");

  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { courseId } = parsed.data;

  // Without "Đơn hàng", pricing fields are left out of the update entirely —
  // the form doesn't render them for this admin, and the DB keeps whatever
  // an order-permitted admin set previously rather than being reset.
  let pricing: { price?: number; salePrice?: number | null; isFree?: boolean } = {};
  if (canManageOrders) {
    const resolved = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
    if (typeof resolved === "string") {
      return resolved;
    }
    pricing = { price: parsed.data.price, salePrice: resolved.salePrice, isFree: resolved.isFree };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: parsed.data.order,
      ...pricing,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

// No redirect — the caller (course list page) just refreshes in place.
export async function deleteCourseAction(courseId: string) {
  await requireAdminPermission("MANAGE_COURSES");
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
  await requireAdminPermission("MANAGE_COURSES");

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

  // No redirect — added inline on the course page, which collapses the form
  // and refreshes in place on success.
  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

const updateCourseLessonSchema = courseLessonSchema.extend({
  lessonId: z.string().min(1),
});

export async function updateCourseLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_COURSES");

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

  // No redirect — edited inline on the course page, same as create above.
  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

// No redirect — callers differ on where they want to end up afterward.
export async function deleteCourseLessonAction(lessonId: string, courseId: string) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseLesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

// Independent of student access — only controls whether this lesson shows
// up under /guest/*, and only takes effect when the parent Course isn't
// hiddenFromGuest (see requireGuestCourseLessonAccess in src/lib/access.ts).
export async function setCourseLessonGuestVisibilityAction(
  lessonId: string,
  courseId: string,
  visibleToGuest: boolean
) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseLesson.update({ where: { id: lessonId }, data: { visibleToGuest } });
  revalidatePath(`/admin/courses/${courseId}`);
}

// Backs the "Cấp quyền học thử cho khách" form on the course edit page — the
// one place that groups every guest-facing setting for a course (hide
// switch, "Khóa học nổi bật" home placement, and which lessons are trial).
// Sets the course-level fields and replaces the full set of trial lessons in
// a single transaction, rather than juggling per-lesson toggles for a bulk
// change. Unchecking every lesson here doesn't hide the course itself
// (that's hiddenFromGuest's job) — it just leaves the course listed with
// nothing guests can actually open, i.e. effectively locked.
export async function setCourseGuestAccessAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_COURSES");

  const courseId = formData.get("courseId");
  if (typeof courseId !== "string" || !courseId) {
    return "Thiếu mã khóa học.";
  }
  const hiddenFromGuest = formData.get("hiddenFromGuest") === "on";
  const featuredOnHome = formData.get("featuredOnHome") === "on";
  const trialLessonIds = formData.getAll("trialLessonIds").filter((v): v is string => typeof v === "string");

  await prisma.$transaction([
    prisma.course.update({ where: { id: courseId }, data: { hiddenFromGuest, featuredOnHome } }),
    prisma.courseLesson.updateMany({ where: { courseId }, data: { visibleToGuest: false } }),
    prisma.courseLesson.updateMany({
      where: { courseId, id: { in: trialLessonIds } },
      data: { visibleToGuest: true },
    }),
  ]);

  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

export async function grantCourseAccessAction(courseId: string, studentId: string) {
  const admin = await requireAdminPermission("MANAGE_COURSES");
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
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseAccessGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function grantCourseLevelAccessAction(courseId: string, minLevel: Level) {
  const admin = await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseLevelGrant.upsert({
    where: { courseId_minLevel: { courseId, minLevel } },
    create: { courseId, minLevel, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function revokeCourseLevelAccessAction(grantId: string, courseId: string) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseLevelGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function setCourseOpenToProspectiveStudentsAction(courseId: string, open: boolean) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.course.update({ where: { id: courseId }, data: { openToProspectiveStudents: open } });
  revalidatePath(`/admin/courses/${courseId}`);
}
