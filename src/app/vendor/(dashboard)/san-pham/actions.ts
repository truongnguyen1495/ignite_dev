"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseYoutubeId } from "@/lib/youtube";
import { fetchYoutubeDurationSeconds } from "@/lib/youtube-duration";
import { deleteLibraryFile } from "@/lib/library-storage";

// ============================================================================
// Every mutation below re-derives vendorId from requireVendorAccountAccess()
// and folds it into the Prisma `where` clause of the write itself (sellerId:
// vendor.id, or an ownership pre-check for a nested row like a chapter/
// lesson) — never from a client-submitted field. This is the one property
// this whole feature cannot get wrong: a vendor id or item id lifted from a
// crafted request must never let one vendor touch another vendor's row. See
// assertOwnsCourse below for the nested-resource version of the same check.
// ============================================================================

function resolveSalePrice(price: number, salePrice: number | undefined): number | null | string {
  if (!salePrice) return null;
  if (salePrice >= price) return "Giá khuyến mãi phải nhỏ hơn giá gốc.";
  return salePrice;
}

// --- Sản phẩm (Product) -----------------------------------------------------

const productSchema = z.object({
  title: z.string().trim().min(1, "Tên sản phẩm không được để trống."),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
});

function readProductFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  };
}

export async function createVendorProductAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const parsed = productSchema.safeParse(readProductFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { _max } = await prisma.product.aggregate({ _max: { order: true } });
  const product = await prisma.product.create({
    data: {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle ?? null,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      order: (_max.order ?? -1) + 1,
      price: parsed.data.price,
      salePrice,
      sellerId: vendor.id,
      // Auto-publishes immediately — only the vendor APPLICATION needs
      // admin approval, never an individual listing (see the Vendor model's
      // own comment for the locked decision this encodes).
      hiddenFromGuest: false,
    },
  });

  revalidatePath("/vendor/san-pham");
  redirect(`/vendor/san-pham/hang-hoa/${product.id}`);
}

export async function updateVendorProductAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) return "Thiếu mã sản phẩm.";

  const parsed = productSchema.safeParse(readProductFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { count } = await prisma.product.updateMany({
    where: { id: productId, sellerId: vendor.id },
    data: {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle ?? null,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      price: parsed.data.price,
      salePrice,
    },
  });
  if (count === 0) return "Không tìm thấy sản phẩm này.";

  revalidatePath("/vendor/san-pham");
  revalidatePath(`/vendor/san-pham/hang-hoa/${productId}`);
  return undefined;
}

export async function toggleVendorProductVisibilityAction(productId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: vendor.id }, select: { hiddenFromGuest: true } });
  if (!product) return;
  await prisma.product.update({ where: { id: productId }, data: { hiddenFromGuest: !product.hiddenFromGuest } });
  revalidatePath("/vendor/san-pham");
}

export async function deleteVendorProductAction(productId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  await prisma.product.deleteMany({ where: { id: productId, sellerId: vendor.id } });
  revalidatePath("/vendor/san-pham");
}

// --- Khoá học (Course) -------------------------------------------------------

const courseSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
});

function readCourseFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  };
}

/** Nested-resource ownership check for every chapter/lesson action below. */
async function assertOwnsCourse(vendorId: string, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { sellerId: true } });
  return course?.sellerId === vendorId;
}

export async function createVendorCourseAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const parsed = courseSchema.safeParse(readCourseFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { _max } = await prisma.course.aggregate({ _max: { order: true } });
  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      order: (_max.order ?? -1) + 1,
      price: parsed.data.price,
      salePrice,
      sellerId: vendor.id,
      hiddenFromGuest: false,
    },
  });

  revalidatePath("/vendor/san-pham");
  redirect(`/vendor/san-pham/khoa-hoc/${course.id}`);
}

export async function updateVendorCourseAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const courseId = formData.get("courseId");
  if (typeof courseId !== "string" || !courseId) return "Thiếu mã khóa học.";

  const parsed = courseSchema.safeParse(readCourseFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { count } = await prisma.course.updateMany({
    where: { id: courseId, sellerId: vendor.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      price: parsed.data.price,
      salePrice,
    },
  });
  if (count === 0) return "Không tìm thấy khóa học này.";

  revalidatePath("/vendor/san-pham");
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
  return undefined;
}

export async function toggleVendorCourseVisibilityAction(courseId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  const course = await prisma.course.findFirst({ where: { id: courseId, sellerId: vendor.id }, select: { hiddenFromGuest: true } });
  if (!course) return;
  await prisma.course.update({ where: { id: courseId }, data: { hiddenFromGuest: !course.hiddenFromGuest } });
  revalidatePath("/vendor/san-pham");
}

export async function deleteVendorCourseAction(courseId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  await prisma.course.deleteMany({ where: { id: courseId, sellerId: vendor.id } });
  revalidatePath("/vendor/san-pham");
}

export async function createVendorCourseChapterAction(courseId: string, title: string): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  if (!(await assertOwnsCourse(vendor.id, courseId))) return "Không tìm thấy khóa học này.";
  const trimmed = title.trim();
  if (!trimmed) return "Tên chương không được để trống.";

  const { _max } = await prisma.courseChapter.aggregate({ where: { courseId }, _max: { order: true } });
  await prisma.courseChapter.create({ data: { courseId, title: trimmed, order: (_max.order ?? -1) + 1 } });
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
  return undefined;
}

export async function deleteVendorCourseChapterAction(chapterId: string, courseId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  if (!(await assertOwnsCourse(vendor.id, courseId))) return;
  await prisma.courseChapter.deleteMany({ where: { id: chapterId, courseId } });
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
}

const courseLessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  content: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  chapterId: z.string().trim().optional(),
});

function resolveYoutubeId(raw: string | undefined): string | null | "invalid" {
  if (!raw) return null;
  const id = parseYoutubeId(raw);
  return id ?? "invalid";
}

async function resolveChapterId(courseId: string, raw: string | undefined): Promise<string | null | "invalid"> {
  if (!raw) return null;
  const chapter = await prisma.courseChapter.findUnique({ where: { id: raw }, select: { courseId: true } });
  if (!chapter || chapter.courseId !== courseId) return "invalid";
  return raw;
}

export async function createVendorCourseLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
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
  const { courseId } = parsed.data;
  if (!(await assertOwnsCourse(vendor.id, courseId))) return "Không tìm thấy khóa học này.";

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") return "Link YouTube không hợp lệ.";
  const chapterId = await resolveChapterId(courseId, parsed.data.chapterId);
  if (chapterId === "invalid") return "Chương không hợp lệ.";

  const { _max } = await prisma.courseLesson.aggregate({ where: { courseId }, _max: { order: true } });
  const durationSeconds = youtubeId ? await fetchYoutubeDurationSeconds(youtubeId) : null;

  await prisma.courseLesson.create({
    data: {
      courseId,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      youtubeId,
      durationSeconds,
      order: (_max.order ?? -1) + 1,
      chapterId,
    },
  });
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
  return undefined;
}

export async function updateVendorCourseLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const lessonId = formData.get("lessonId");
  const parsed = courseLessonSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    content: formData.get("content") || undefined,
    youtube: formData.get("youtube") || undefined,
    chapterId: formData.get("chapterId") || undefined,
  });
  if (typeof lessonId !== "string" || !lessonId || !parsed.success) {
    return parsed.success ? "Thiếu mã bài học." : (parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }
  const { courseId } = parsed.data;
  if (!(await assertOwnsCourse(vendor.id, courseId))) return "Không tìm thấy khóa học này.";
  // Lesson itself must also belong to this course, not just any course of
  // this vendor's — otherwise a crafted lessonId from a DIFFERENT one of the
  // vendor's own courses would silently move under this one.
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId }, select: { courseId: true, youtubeId: true, durationSeconds: true } });
  if (!lesson || lesson.courseId !== courseId) return "Không tìm thấy bài học này.";

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") return "Link YouTube không hợp lệ.";
  const chapterId = await resolveChapterId(courseId, parsed.data.chapterId);
  if (chapterId === "invalid") return "Chương không hợp lệ.";

  const durationSeconds =
    youtubeId === lesson.youtubeId ? lesson.durationSeconds : youtubeId ? await fetchYoutubeDurationSeconds(youtubeId) : null;

  await prisma.courseLesson.update({
    where: { id: lessonId },
    data: { title: parsed.data.title, content: parsed.data.content ?? "", youtubeId, durationSeconds, chapterId },
  });
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
  return undefined;
}

export async function deleteVendorCourseLessonAction(lessonId: string, courseId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  if (!(await assertOwnsCourse(vendor.id, courseId))) return;
  await prisma.courseLesson.deleteMany({ where: { id: lessonId, courseId } });
  revalidatePath(`/vendor/san-pham/khoa-hoc/${courseId}`);
}

// --- Sách & tài liệu (LibraryItem, PDF only) --------------------------------
//
// INTERACTIVE format (the canvas book editor) is NOT offered to vendors —
// cut for time, per the explicit priority order in this feature's spec
// ("cut LibraryItem's INTERACTIVE canvas before cutting anything else").
// Every vendor LibraryItem is created with format: "PDF".

const libraryItemSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
  filePath: z.string().trim().optional(),
  pageCount: z.coerce.number().int().optional(),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
});

function readLibraryFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    filePath: formData.get("filePath") || undefined,
    pageCount: formData.get("pageCount") || undefined,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  };
}

export async function createVendorLibraryItemAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const parsed = libraryItemSchema.safeParse(readLibraryFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  if (!parsed.data.filePath) return "Cần tải lên file PDF.";
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { _max } = await prisma.libraryItem.aggregate({ _max: { order: true } });
  const item = await prisma.libraryItem.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      type: "BOOK",
      format: "PDF",
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      filePath: parsed.data.filePath,
      pageCount: parsed.data.pageCount ?? null,
      order: (_max.order ?? -1) + 1,
      price: parsed.data.price,
      salePrice,
      sellerId: vendor.id,
      visibleToStudents: true,
      visibleToGuest: false,
    },
  });

  revalidatePath("/vendor/san-pham");
  redirect(`/vendor/san-pham/sach/${item.id}`);
}

export async function updateVendorLibraryItemAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const libraryItemId = formData.get("libraryItemId");
  if (typeof libraryItemId !== "string" || !libraryItemId) return "Thiếu mã tài liệu.";

  const parsed = libraryItemSchema.safeParse(readLibraryFormData(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  if (!parsed.data.filePath) return "Cần tải lên file PDF.";
  const salePrice = resolveSalePrice(parsed.data.price, parsed.data.salePrice);
  if (typeof salePrice === "string") return salePrice;

  const { count } = await prisma.libraryItem.updateMany({
    where: { id: libraryItemId, sellerId: vendor.id },
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      filePath: parsed.data.filePath,
      pageCount: parsed.data.pageCount ?? null,
      price: parsed.data.price,
      salePrice,
    },
  });
  if (count === 0) return "Không tìm thấy tài liệu này.";

  revalidatePath("/vendor/san-pham");
  revalidatePath(`/vendor/san-pham/sach/${libraryItemId}`);
  return undefined;
}

export async function toggleVendorLibraryItemVisibilityAction(libraryItemId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  const item = await prisma.libraryItem.findFirst({
    where: { id: libraryItemId, sellerId: vendor.id },
    select: { visibleToStudents: true },
  });
  if (!item) return;
  await prisma.libraryItem.update({ where: { id: libraryItemId }, data: { visibleToStudents: !item.visibleToStudents } });
  revalidatePath("/vendor/san-pham");
}

export async function deleteVendorLibraryItemAction(libraryItemId: string): Promise<void> {
  const { vendor } = await requireVendorAccountAccess();
  const item = await prisma.libraryItem.findFirst({ where: { id: libraryItemId, sellerId: vendor.id } });
  if (!item) return;
  await prisma.libraryItem.delete({ where: { id: libraryItemId } });
  if (item.filePath) {
    try {
      await deleteLibraryFile(item.filePath);
    } catch (error) {
      console.error("Failed to delete vendor library storage object:", error);
    }
  }
  revalidatePath("/vendor/san-pham");
}
