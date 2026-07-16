"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level, LibraryItemType, LibraryItemFormat } from "@prisma/client";
import { requireAdminPermission, hasAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadLibraryFile, uploadLibraryFile, deleteLibraryFile } from "@/lib/library-storage";
import { extractFirstPages } from "@/lib/library-pdf";
import { bookPagesPayloadSchema } from "@/lib/library-book-elements";

const libraryItemTypeEnum = z.enum(["BOOK", "DOCUMENT"] as [LibraryItemType, ...LibraryItemType[]]);
const libraryItemFormatEnum = z.enum(["PDF", "INTERACTIVE"] as [LibraryItemFormat, ...LibraryItemFormat[]]);

const libraryItemSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  type: libraryItemTypeEnum,
  format: libraryItemFormatEnum,
  coverImageUrl: z.string().trim().optional(),
  backgroundImageUrl: z.string().trim().optional(),
  // Required only for format===PDF, checked by hand after parsing (a plain
  // zod .min(1) here would also reject every INTERACTIVE submission).
  filePath: z.string().trim().optional(),
  pageCount: z.coerce.number().int().optional(),
  guestPreviewPages: z.coerce.number().int().positive().optional(),
  order: z.coerce.number().int().default(0),
  price: z.coerce.number().int().min(0, "Giá không được âm.").default(0),
  salePrice: z.coerce.number().int().min(0, "Giá khuyến mãi không được âm.").optional(),
  // INTERACTIVE-only: fixed design-pixel page size, chosen once at creation.
  bookWidth: z.coerce.number().int().positive().default(800),
  bookHeight: z.coerce.number().int().positive().default(1131),
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
  const admin = await requireAdminPermission("MANAGE_LIBRARY");
  const canManageOrders = await hasAdminPermission(admin, "MANAGE_ORDERS");

  const parsed = libraryItemSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    format: formData.get("format"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    backgroundImageUrl: formData.get("backgroundImageUrl") || undefined,
    filePath: formData.get("filePath") || undefined,
    pageCount: formData.get("pageCount") || undefined,
    guestPreviewPages: formData.get("guestPreviewPages") || undefined,
    order: formData.get("order") || 0,
    price: formData.get("price") || 0,
    salePrice: formData.get("salePrice") || undefined,
    bookWidth: formData.get("bookWidth") || undefined,
    bookHeight: formData.get("bookHeight") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  if (parsed.data.format === "PDF" && !parsed.data.filePath) {
    return "Cần tải lên file PDF.";
  }

  // "Miễn phí" is available to any admin who can manage library items at
  // all — only giá gốc/giá khuyến mãi stay behind "Đơn hàng" (MANAGE_ORDERS),
  // same split as admin/courses/actions.ts.
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

  const visibleToGuest = formData.get("visibleToGuest") === "on";
  const featuredOnHome = formData.get("featuredOnHome") === "on";

  if (parsed.data.format === "INTERACTIVE") {
    // No filePath, no PDF preview generation — an interactive book starts
    // with zero pages, authored afterward in the editor
    // (saveLibraryBookPagesAction sets pageCount and guestPreviewPages'
    // meaningfulness once real pages exist).
    const item = await prisma.libraryItem.create({
      data: {
        title: parsed.data.title,
        author: parsed.data.author ?? null,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        format: "INTERACTIVE",
        coverImageUrl: parsed.data.coverImageUrl ?? null,
        backgroundImageUrl: parsed.data.backgroundImageUrl ?? null,
        filePath: null,
        bookWidth: parsed.data.bookWidth,
        bookHeight: parsed.data.bookHeight,
        pageCount: 0,
        order: parsed.data.order,
        price: pricing.price,
        salePrice: pricing.salePrice,
        isFree: pricing.isFree,
        visibleToGuest,
        featuredOnHome,
      },
    });
    revalidatePath("/admin/library");
    redirect(`/admin/library/${item.id}/editor`);
  }

  const previewFilePath =
    visibleToGuest && parsed.data.guestPreviewPages
      ? await generateLibraryPreview(parsed.data.filePath!, parsed.data.guestPreviewPages)
      : null;

  const item = await prisma.libraryItem.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      format: "PDF",
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      backgroundImageUrl: parsed.data.backgroundImageUrl ?? null,
      filePath: parsed.data.filePath!,
      pageCount: parsed.data.pageCount ?? null,
      previewFilePath,
      guestPreviewPages: parsed.data.guestPreviewPages ?? null,
      order: parsed.data.order,
      price: pricing.price,
      salePrice: pricing.salePrice,
      isFree: pricing.isFree,
      visibleToGuest,
      featuredOnHome,
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
  const admin = await requireAdminPermission("MANAGE_LIBRARY");
  const canManageOrders = await hasAdminPermission(admin, "MANAGE_ORDERS");

  const parsed = updateLibraryItemSchema.safeParse({
    libraryItemId: formData.get("libraryItemId"),
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    format: formData.get("format") || "PDF",
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    backgroundImageUrl: formData.get("backgroundImageUrl") || undefined,
    filePath: formData.get("filePath") || undefined,
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

  // "Miễn phí" is always honored, even without "Đơn hàng" — giá gốc/giá
  // khuyến mãi stay out of the update entirely for such an admin (the form
  // doesn't render them), same rule as updateCourseAction above.
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

  // format is fixed after creation (never trust a submitted value for it) —
  // read the item's real format from the DB to decide which fields apply.
  const current = await prisma.libraryItem.findUnique({
    where: { id: libraryItemId },
    select: { format: true, filePath: true, visibleToGuest: true, guestPreviewPages: true, previewFilePath: true },
  });
  if (!current) {
    return "Không tìm thấy mục thư viện.";
  }

  if (current.format === "INTERACTIVE") {
    // No filePath/preview fields at all — those only exist for PDF items;
    // page content itself is edited via the editor (saveLibraryBookPagesAction).
    await prisma.libraryItem.update({
      where: { id: libraryItemId },
      data: {
        title: parsed.data.title,
        author: parsed.data.author ?? null,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        coverImageUrl: parsed.data.coverImageUrl ?? null,
        backgroundImageUrl: parsed.data.backgroundImageUrl ?? null,
        order: parsed.data.order,
        ...pricing,
      },
    });
    revalidatePath("/admin/library");
    revalidatePath(`/admin/library/${libraryItemId}`);
    return undefined;
  }

  if (!parsed.data.filePath) {
    return "Cần tải lên file PDF.";
  }

  // visibleToGuest/guestPreviewPages/featuredOnHome are edited from the
  // separate "Cấp quyền cho khách" form (setLibraryItemGuestAccessAction)
  // now, not this one — read the current row so swapping the PDF here still
  // regenerates (or clears) the preview correctly without this form having
  // to carry those fields along just to avoid resetting them.
  const fileChanged = current.filePath !== parsed.data.filePath;
  const previewFilePath = fileChanged
    ? current.visibleToGuest && current.guestPreviewPages
      ? await generateLibraryPreview(parsed.data.filePath, current.guestPreviewPages)
      : null
    : (current.previewFilePath ?? null);

  await prisma.libraryItem.update({
    where: { id: libraryItemId },
    data: {
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      backgroundImageUrl: parsed.data.backgroundImageUrl ?? null,
      filePath: parsed.data.filePath,
      pageCount: parsed.data.pageCount ?? null,
      previewFilePath,
      order: parsed.data.order,
      ...pricing,
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
  // Absent for INTERACTIVE items — they have no PDF to generate a preview
  // from, trial access there is just "serve the first guestPreviewPages
  // rows" (see /api/library/[itemId]/pages), no separate asset needed.
  const filePath = formData.get("filePath");
  if (typeof libraryItemId !== "string" || !libraryItemId) {
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
    typeof filePath === "string" && filePath && visibleToGuest && guestPreviewPages
      ? await generateLibraryPreview(filePath, guestPreviewPages)
      : null;

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
      // INTERACTIVE items have no filePath/previewFilePath — their
      // LibraryBookPage rows cascade-delete via the schema relation instead.
      if (item.filePath) {
        await deleteLibraryFile(item.filePath);
      }
      if (item.previewFilePath) {
        await deleteLibraryFile(item.previewFilePath);
      }
    } catch (error) {
      console.error("Failed to delete library storage objects:", error);
    }
  }

  revalidatePath("/admin/library");
}

// Backs the editor's Save button (src/app/admin/library/[itemId]/editor) —
// full delete-and-recreate transaction, same pattern as
// setCourseGuestAccessAction in admin/courses/actions.ts. `pages` is
// validated in full via bookPagesPayloadSchema before anything is written,
// so a malformed payload never leaves the book half-saved.
export async function saveLibraryBookPagesAction(
  libraryItemId: string,
  pages: unknown
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_LIBRARY");

  const parsed = bookPagesPayloadSchema.safeParse(pages);
  if (!parsed.success) {
    return "Dữ liệu trang không hợp lệ.";
  }

  await prisma.$transaction([
    prisma.libraryBookPage.deleteMany({ where: { libraryItemId } }),
    prisma.libraryBookPage.createMany({
      data: parsed.data.map((page, index) => ({
        libraryItemId,
        order: index,
        backgroundColor: page.backgroundColor ?? null,
        backgroundImageUrl: page.backgroundImageUrl ?? null,
        elements: page.elements,
      })),
    }),
    prisma.libraryItem.update({
      where: { id: libraryItemId },
      data: { pageCount: parsed.data.length },
    }),
  ]);

  revalidatePath(`/admin/library/${libraryItemId}/editor`);
  revalidatePath(`/admin/library/${libraryItemId}`);
  return undefined;
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
