"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import type { Level, AnnouncementCategory } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);
const categoryEnum = z.enum(
  ORDERED_ANNOUNCEMENT_CATEGORIES as [AnnouncementCategory, ...AnnouncementCategory[]]
);

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  content: z.string().trim().min(1, "Nội dung không được để trống."),
  coverImageUrl: z.string().trim().optional(),
  category: categoryEnum,
  minLevel: z.union([levelEnum, z.literal("")]).optional(),
});

function resolveMinLevel(raw: Level | "" | undefined): Level | null {
  return raw || null;
}

export async function createAnnouncementAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    category: formData.get("category"),
    minLevel: formData.get("minLevel") || "",
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      category: parsed.data.category,
      minLevel: resolveMinLevel(parsed.data.minLevel),
      visibleToGuest: formData.get("visibleToGuest") === "on",
      visibleToStudents: formData.get("visibleToStudents") === "on",
    },
  });

  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}

const updateSchema = announcementSchema.extend({
  announcementId: z.string().min(1),
});

export async function updateAnnouncementAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = updateSchema.safeParse({
    announcementId: formData.get("announcementId"),
    title: formData.get("title"),
    content: formData.get("content"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    category: formData.get("category"),
    minLevel: formData.get("minLevel") || "",
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { announcementId } = parsed.data;

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      category: parsed.data.category,
      minLevel: resolveMinLevel(parsed.data.minLevel),
      visibleToGuest: formData.get("visibleToGuest") === "on",
      visibleToStudents: formData.get("visibleToStudents") === "on",
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath(`/admin/announcements/${announcementId}`);
  redirect("/admin/announcements");
}

// No redirect here — callers differ on where they want to end up afterward,
// same convention as deleteLessonAction.
export async function deleteAnnouncementAction(announcementId: string) {
  await requireActiveSuperAdmin();
  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath("/admin/announcements");
}

// Independent of level gating — only controls whether this announcement
// shows up under /guest/* (see requireGuestAnnouncementAccess in src/lib/access.ts).
export async function setAnnouncementGuestVisibilityAction(
  announcementId: string,
  visibleToGuest: boolean
) {
  await requireActiveSuperAdmin();
  await prisma.announcement.update({ where: { id: announcementId }, data: { visibleToGuest } });
  revalidatePath("/admin/announcements");
}

// Master hide switch — pulls the announcement from both the student-facing
// /dashboard/announcements list/detail page and the public /guest/* one
// (overriding visibleToGuest; see requireAnnouncementAccess and
// requireGuestAnnouncementAccess in src/lib/access.ts) without deleting it.
export async function setAnnouncementVisibleToStudentsAction(
  announcementId: string,
  visibleToStudents: boolean
) {
  await requireActiveSuperAdmin();
  await prisma.announcement.update({ where: { id: announcementId }, data: { visibleToStudents } });
  revalidatePath("/admin/announcements");
}
