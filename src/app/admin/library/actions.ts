"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level, LibraryItemType } from "@prisma/client";
import { requireActiveSuperAdmin } from "@/lib/access";
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
});

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
  await requireActiveSuperAdmin();

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
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
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
      visibleToGuest,
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
  await requireActiveSuperAdmin();

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
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { libraryItemId } = parsed.data;
  const visibleToGuest = formData.get("visibleToGuest") === "on";
  const previewFilePath =
    visibleToGuest && parsed.data.guestPreviewPages
      ? await generateLibraryPreview(parsed.data.filePath, parsed.data.guestPreviewPages)
      : null;

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
      guestPreviewPages: parsed.data.guestPreviewPages ?? null,
      order: parsed.data.order,
      visibleToGuest,
    },
  });

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${libraryItemId}`);
  return undefined;
}

export async function deleteLibraryItemAction(libraryItemId: string) {
  await requireActiveSuperAdmin();
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

export async function grantLibraryAccessAction(libraryItemId: string, studentId: string) {
  const admin = await requireActiveSuperAdmin();
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
  await requireActiveSuperAdmin();
  await prisma.libraryAccessGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function grantLibraryLevelAccessAction(libraryItemId: string, minLevel: Level) {
  const admin = await requireActiveSuperAdmin();
  await prisma.libraryLevelGrant.upsert({
    where: { libraryItemId_minLevel: { libraryItemId, minLevel } },
    create: { libraryItemId, minLevel, grantedById: admin.id },
    update: {},
  });
  revalidatePath(`/admin/library/${libraryItemId}`);
}

export async function revokeLibraryLevelAccessAction(grantId: string, libraryItemId: string) {
  await requireActiveSuperAdmin();
  await prisma.libraryLevelGrant.delete({ where: { id: grantId } });
  revalidatePath(`/admin/library/${libraryItemId}`);
}
