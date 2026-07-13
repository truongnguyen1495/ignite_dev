"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level, LibraryItemType } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadLibraryFile, uploadLibraryFile, deleteLibraryFile } from "@/lib/library-storage";
import { extractFirstPages } from "@/lib/library-pdf";

const libraryItemTypeEnum = z.enum(["BOOK", "DOCUMENT"] as [LibraryItemType, ...LibraryItemType[]]);

const libraryItemSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  type: libraryItemTypeEnum,
  coverImageUrl: z.string().trim().optional(),
  filePath: z.string().trim().min(1, "Cần tải lên file PDF."),
  pageCount: z.coerce.number().int().optional(),
  guestPreviewPages: z.coerce.number().int().positive().optional(),
  order: z.coerce.number().int().default(0),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
});

// Same rule as resolvePricingFields in admin/courses/actions.ts.
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

// Builds a standalone preview PDF (first `pages` pages of `filePath`) and
// stores it as its own object, reusing the source's base name so repeated
// calls (e.g. admin changes the preview page count later) just overwrite it.
async function generateLibraryPreview(filePath: string, pages: number): Promise<string> {
  const bytes = await downloadLibraryFile(filePath);
  const previewBytes = await extractFirstPages(bytes, pages);
  const previewPath = `${filePath.replace(/\.pdf$/i, "")}-preview.pdf`;
  await uploadLibraryFile(previewBytes, previewPath);
  return previewPath;
}

export async function createLibraryItemAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_LIBRARY");

  const parsed = libraryItemSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    filePath: formData.get("filePath"),
    pageCount: formData.get("pageCount") || undefined,
    guestPreviewPages: formData.get("guestPreviewPages") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const pricing = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
  if (typeof pricing === "string") {
    return pricing;
  }

  const visibleToGuest = formData.get("visibleToGuest") === "on";
  const previewFilePath =
    visibleToGuest && parsed.data.guestPreviewPages
      ? await generateLibraryPreview(parsed.data.filePath, parsed.data.guestPreviewPages)
      : null;

  const item = await prisma.libraryItem.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      filePath: parsed.data.filePath,
      pageCount: parsed.data.pageCount ?? null,
      previewFilePath,
      guestPreviewPages: parsed.data.guestPreviewPages ?? null,
      order: parsed.data.order,
      price: parsed.data.price,
      salePrice: pricing.salePrice,
      isFree: pricing.isFree,
      visibleToGuest,
      featuredOnHome: formData.get("featuredOnHome") === "on",
    },
  });

  revalidatePath("/admin/library");
  redirect(`/admin/library/${item.id}`);
}

const updateLibraryItemSchema = libraryItemSchema.extend({
  libraryItemId: z.string().min(1),
});

export async function updateLibraryItemAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_LIBRARY");

  const parsed = updateLibraryItemSchema.safeParse({
    libraryItemId: formData.get("libraryItemId"),
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    filePath: formData.get("filePath"),
    pageCount: formData.get("pageCount") || undefined,
    guestPreviewPages: formData.get("guestPreviewPages") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { libraryItemId } = parsed.data;

  const pricing = resolvePricingFields(formData, parsed.data.price, parsed.data.salePrice);
  if (typeof pricing === "string") {
    return pricing;
  }

  // visibleToGuest/guestPreviewPages/featuredOnHome are edited from the
  // separate "Cấp quyền cho khách" form (setLibraryItemGuestAccessAction)
  // now, not this one — read the current row so swapping the PDF here still
  // regenerates (or clears) the preview correctly without this form having
  // to carry those fields along just to avoid resetting them.
  const current = await prisma.libraryItem.findUnique({
    where: { id: libraryItemId },
    select: { filePath: true, visibleToGuest: true, guestPreviewPages: true, previewFilePath: true },
  });
  const fileChanged = current !== null && current.filePath !== parsed.data.filePath;
  const previewFilePath = fileChanged
    ? current?.visibleToGuest && current.guestPreviewPages
      ? await generateLibraryPreview(parsed.data.filePath, current.guestPreviewPages)
      : null
    : (current?.previewFilePath ?? null);

  await prisma.libraryItem.update({
    where: { id: libraryItemId },
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      filePath: parsed.data.filePath,
      pageCount: parsed.data.pageCount ?? null,
      previewFilePath,
      order: parsed.data.order,
      price: parsed.data.price,
      salePrice: pricing.salePrice,
      isFree: pricing.isFree,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${libraryItemId}`);
  return undefined;
}

// Backs the "Cấp quyền cho khách" form on the library item edit page — the
// guest-facing counterpart to updateLibraryItemAction above, split out the
// same way CourseGuestAccessForm/setCourseGuestAccessAction is split from
// the course edit form. filePath is carried in as a hidden field (current
// value, not editable here) purely so the preview PDF can be regenerated.
export async function setLibraryItemGuestAccessAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_LIBRARY");

  const libraryItemId = formData.get("libraryItemId");
  const filePath = formData.get("filePath");
  if (typeof libraryItemId !== "string" || !libraryItemId || typeof filePath !== "string" || !filePath) {
    return "Thiếu dữ liệu.";
  }

  const guestPreviewPagesRaw = formData.get("guestPreviewPages");
  const guestPreviewPages =
    typeof guestPreviewPagesRaw === "string" && guestPreviewPagesRaw
      ? Number.parseInt(guestPreviewPagesRaw, 10)
      : undefined;
  if (guestPreviewPages !== undefined && (!Number.isInteger(guestPreviewPages) || guestPreviewPages <= 0)) {
    return "Số trang đọc thử không hợp lệ.";
  }

  const visibleToGuest = formData.get("visibleToGuest") === "on";
  const featuredOnHome = formData.get("featuredOnHome") === "on";
  const previewFilePath =
    visibleToGuest && guestPreviewPages ? await generateLibraryPreview(filePath, guestPreviewPages) : null;

  await prisma.libraryItem.update({
    where: { id: libraryItemId },
    data: {
      visibleToGuest,
      guestPreviewPages: guestPreviewPages ?? null,
      previewFilePath,
      featuredOnHome,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${libraryItemId}`);
  return undefined;
}

export async function deleteLibraryItemAction(libraryItemId: string) {
  await requireAdminPermission("MANAGE_LIBRARY");
  const item = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  await prisma.libraryItem.delete({ where: { id: libraryItemId } });

  if (item) {
    try {
      await deleteLibraryFile(item.filePath);
      if (item.previewFilePath) {
        await deleteLibraryFile(item.previewFilePath);
      }
    } catch (error) {
      console.error("Failed to delete library storage objects:", error);
    }
  }

  revalidatePath("/admin/library");
}

// Independent of level gating — only controls whether this item shows up
// under /guest/* (see requireGuestLibraryItemAccess in src/lib/access.ts).
export async function setLibraryItemGuestVisibilityAction(libraryItemId: string, visibleToGuest: boolean) {
  await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryItem.update({ where: { id: libraryItemId }, data: { visibleToGuest } });
  revalidatePath("/admin/library");
}

// Master hide switch — pulls the item from both the student-facing
// /dashboard/library list/reader and the public /guest/library one
// (overriding visibleToGuest; see requireLibraryItemAccess and
// requireGuestLibraryItemAccess in src/lib/access.ts) without deleting it
// or touching any grants.
export async function setLibraryItemVisibleToStudentsAction(
  libraryItemId: string,
  visibleToStudents: boolean
) {
  await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryItem.update({ where: { id: libraryItemId }, data: { visibleToStudents } });
  revalidatePath("/admin/library");
}

export async function grantLibraryAccessAction(libraryItemId: string, studentId: string) {
  const admin = await requireAdminPermission("MANAGE_LIBRARY");
  if (!studentId) {
    return;
  }

  await prisma.libraryAccessGrant.upsert({
    where: { studentId_libraryItemId: { studentId, libraryItemId } },
    create: { studentId, libraryItemId, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function revokeLibraryAccessAction(grantId: string, libraryItemId: string) {
  await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryAccessGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function grantLibraryLevelAccessAction(libraryItemId: string, minLevel: Level) {
  const admin = await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryLevelGrant.upsert({
    where: { libraryItemId_minLevel: { libraryItemId, minLevel } },
    create: { libraryItemId, minLevel, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function revokeLibraryLevelAccessAction(grantId: string, libraryItemId: string) {
  await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryLevelGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function setLibraryItemOpenToProspectiveStudentsAction(libraryItemId: string, open: boolean) {
  await requireAdminPermission("MANAGE_LIBRARY");
  await prisma.libraryItem.update({ where: { id: libraryItemId }, data: { openToProspectiveStudents: open } });
  revalidatePath(`/admin/library/${libraryItemId}`);
}
