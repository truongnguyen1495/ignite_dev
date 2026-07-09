"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  content: z.string().trim().min(1, "Nội dung không được để trống."),
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
    minLevel: formData.get("minLevel") || "",
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      minLevel: resolveMinLevel(parsed.data.minLevel),
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
      minLevel: resolveMinLevel(parsed.data.minLevel),
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
