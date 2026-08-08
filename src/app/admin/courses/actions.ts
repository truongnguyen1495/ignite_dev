"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level } from "@prisma/client";
import { requireAdminPermission, hasAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseYoutubeId } from "@/lib/youtube";
import { fetchYoutubeDurationSeconds } from "@/lib/youtube-duration";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
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
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  // "Miễn phí" is available to any admin who can manage courses at all —
  // only giá gốc/giá khuyến mãi stay behind "Đơn hàng" (MANAGE_ORDERS), since
  // those are a money concern rather than content availability. An admin
  // without "Đơn hàng" still creates at giá 0 (form hides the price fields
  // for them), but their isFree tick is honored either way.
  const isFree = formData.get("isFree") === "on";
  let pricing: { price: number; salePrice: number | null; isFree: boolean };
  if (canManageOrders) {
    const resolved = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
    if (typeof resolved === "string") {
      return resolved;
    }
    pricing = { price: parsed.data.price, salePrice: resolved.salePrice, isFree: resolved.isFree };
  } else {
    pricing = { price: 0, salePrice: null, isFree };
  }

  // New courses always land at the end of the list — order is no longer a
  // free-text field an admin types in (see ReorderModal on /admin/courses
  // for how existing courses get repositioned instead).
  const { _max } = await prisma.course.aggregate({ _max: { order: true } });
  const nextOrder = (_max.order ?? -1) + 1;

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: nextOrder,
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
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { courseId } = parsed.data;

  // "Miễn phí" is always honored, even for an admin without "Đơn hàng" — see
  // the comment on the same branch in createCourseAction above. Giá gốc/giá
  // khuyến mãi stay out of the update entirely for such an admin (the form
  // doesn't render them), so the DB keeps whatever an order-permitted admin
  // set previously rather than being reset.
  const isFree = formData.get("isFree") === "on";
  let pricing: { price?: number; salePrice?: number | null; isFree?: boolean };
  if (canManageOrders) {
    const resolved = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
    if (typeof resolved === "string") {
      return resolved;
    }
    pricing = { price: parsed.data.price, salePrice: resolved.salePrice, isFree: resolved.isFree };
  } else {
    pricing = { isFree };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
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

// Persists a full drag-and-drop reorder from ReorderModal — each id's new
// `order` is just its index in the array, one $transaction so the list
// never reads a half-applied order mid-write.
export async function reorderCoursesAction(orderedIds: string[]) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.course.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath("/admin/courses");
}

function resolveYoutubeId(raw: string | undefined): string | null | "invalid" {
  if (!raw) return null;
  const id = parseYoutubeId(raw);
  return id ?? "invalid";
}

// Chapters are pure grouping metadata for CourseLesson — see the comment on
// the CourseChapter model in schema.prisma for why chapter NUMBERS are
// always derived from list position rather than stored.
export async function createCourseChapterAction(courseId: string, title: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_COURSES");
  const trimmed = title.trim();
  if (!trimmed) return "Tên chương không được để trống.";

  const { _max } = await prisma.courseChapter.aggregate({ where: { courseId }, _max: { order: true } });
  const nextOrder = (_max.order ?? -1) + 1;
  await prisma.courseChapter.create({ data: { courseId, title: trimmed, order: nextOrder } });

  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

export async function renameCourseChapterAction(
  chapterId: string,
  courseId: string,
  title: string
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_COURSES");
  const trimmed = title.trim();
  if (!trimmed) return "Tên chương không được để trống.";

  await prisma.courseChapter.update({ where: { id: chapterId }, data: { title: trimmed } });
  revalidatePath(`/admin/courses/${courseId}`);
  return undefined;
}

// Lessons in this chapter aren't deleted — CourseLesson.chapterId just goes
// back to null via the schema's onDelete: SetNull (see schema.prisma).
export async function deleteCourseChapterAction(chapterId: string, courseId: string) {
  await requireAdminPermission("MANAGE_COURSES");
  await prisma.courseChapter.delete({ where: { id: chapterId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function reorderCourseChaptersAction(courseId: string, orderedIds: string[]) {
  await requireAdminPermission("MANAGE_COURSES");
  const chapters = await prisma.courseChapter.findMany({ where: { courseId }, select: { id: true } });
  const validIds = new Set(chapters.map((c) => c.id));
  if (orderedIds.length !== validIds.size || !orderedIds.every((id) => validIds.has(id))) {
    throw new Error("Danh sách chương không hợp lệ.");
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.courseChapter.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath(`/admin/courses/${courseId}`);
}

const courseLessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  content: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  // "" (the select's own "Không thuộc chương nào" option) means no chapter —
  // not passed to zod as an enum since chapter ids are dynamic per course.
  chapterId: z.string().trim().optional(),
});

// "" (or missing) means no chapter. Re-checks the chapter actually belongs
// to this course — a stale/tampered chapterId from a form submitted against
// the wrong course must never silently attach a lesson to another course's
// chapter, same defensive pattern as reorderCourseLessonsAction's id check.
async function resolveChapterId(courseId: string, raw: string | undefined): Promise<string | null | "invalid"> {
  if (!raw) return null;
  const chapter = await prisma.courseChapter.findUnique({ where: { id: raw }, select: { courseId: true } });
  if (!chapter || chapter.courseId !== courseId) return "invalid";
  return raw;
}

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
    chapterId: formData.get("chapterId") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") {
    return "Link YouTube không hợp lệ.";
  }

  const { courseId } = parsed.data;

  const chapterId = await resolveChapterId(courseId, parsed.data.chapterId);
  if (chapterId === "invalid") {
    return "Chương không hợp lệ.";
  }

  // New lessons always land at the end — order is no longer a free-text
  // field an admin types in (see reorderCourseLessonsAction below, backing
  // the lesson list's own drag-and-drop, same convention as
  // reorderCoursesAction/ReorderModal for the course list itself).
  const { _max } = await prisma.courseLesson.aggregate({ where: { courseId }, _max: { order: true } });
  const nextOrder = (_max.order ?? -1) + 1;

  const durationSeconds = youtubeId ? await fetchYoutubeDurationSeconds(youtubeId) : null;

  await prisma.courseLesson.create({
    data: {
      courseId,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      youtubeId,
      durationSeconds,
      order: nextOrder,
      chapterId,
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
    chapterId: formData.get("chapterId") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") {
    return "Link YouTube không hợp lệ.";
  }

  const { lessonId, courseId } = parsed.data;

  const chapterId = await resolveChapterId(courseId, parsed.data.chapterId);
  if (chapterId === "invalid") {
    return "Chương không hợp lệ.";
  }

  // Only re-fetches duration when youtubeId actually changed (including
  // clearing it) — re-hitting the YouTube API on every text-only edit of an
  // otherwise-unchanged video would just burn quota for no reason.
  const existing = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: { youtubeId: true, durationSeconds: true },
  });
  const durationSeconds =
    youtubeId === (existing?.youtubeId ?? null)
      ? (existing?.durationSeconds ?? null)
      : youtubeId
        ? await fetchYoutubeDurationSeconds(youtubeId)
        : null;

  await prisma.courseLesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      youtubeId,
      durationSeconds,
      chapterId,
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

// Persists a direct drag-and-drop reorder from CourseOutlineSection's own
// list (no modal, unlike ReorderModal — the user wanted dragging right in
// place). Each id's new `order` is just its index; verified to all belong
// to courseId first so a stale/tampered id list can't touch another
// course's lessons.
export async function reorderCourseLessonsAction(courseId: string, orderedIds: string[]) {
  await requireAdminPermission("MANAGE_COURSES");
  const lessons = await prisma.courseLesson.findMany({ where: { courseId }, select: { id: true } });
  const validIds = new Set(lessons.map((l) => l.id));
  if (orderedIds.length !== validIds.size || !orderedIds.every((id) => validIds.has(id))) {
    throw new Error("Danh sách bài học không hợp lệ.");
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.courseLesson.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath(`/admin/courses/${courseId}`);
}

// Backs CourseOutlineSection's merged chapter+lesson view — a cross-chapter
// drag changes both a lesson's chapterId AND its global `order` in one
// gesture, so both need to land in the same transaction (updating just one
// of the two would let a concurrent read briefly see a lesson re-grouped
// but not yet reordered, or vice versa). `groups` is every chapter (in its
// current display order) plus one trailing `chapterId: null` group for
// "Chưa xếp chương" — order is assigned by flattening every group's
// lessonIds in sequence, same convention as reorderCourseLessonsAction
// above (index = new `order`), so a plain reorderCourseLessonsAction call
// elsewhere in the app still sees a consistent, chapter-grouped sequence.
export async function reorderCourseOutlineAction(
  courseId: string,
  groups: { chapterId: string | null; lessonIds: string[] }[]
) {
  await requireAdminPermission("MANAGE_COURSES");

  const [lessons, chapters] = await Promise.all([
    prisma.courseLesson.findMany({ where: { courseId }, select: { id: true } }),
    prisma.courseChapter.findMany({ where: { courseId }, select: { id: true } }),
  ]);
  const validLessonIds = new Set(lessons.map((l) => l.id));
  const validChapterIds = new Set(chapters.map((c) => c.id));
  const allLessonIds = groups.flatMap((g) => g.lessonIds);

  if (
    allLessonIds.length !== validLessonIds.size ||
    !allLessonIds.every((id) => validLessonIds.has(id)) ||
    !groups.every((g) => g.chapterId === null || validChapterIds.has(g.chapterId))
  ) {
    throw new Error("Danh sách bài học không hợp lệ.");
  }

  let order = 0;
  const updates = groups.flatMap((group) =>
    group.lessonIds.map((lessonId) =>
      prisma.courseLesson.update({
        where: { id: lessonId },
        data: { chapterId: group.chapterId, order: order++ },
      })
    )
  );
  await prisma.$transaction(updates);
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
  // Form field is the positive framing ("Hiển thị cho khách xem") — DB
  // column stays hiddenFromGuest (the negative/"master hide switch" is what
  // every access-check elsewhere in the app already reads), so invert once
  // right here rather than renaming the column.
  const visibleToGuest = formData.get("visibleToGuest") === "on";
  const hiddenFromGuest = !visibleToGuest;
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
