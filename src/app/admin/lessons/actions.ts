"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import { parseYoutubeId } from "@/lib/youtube";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  level: levelEnum,
  content: z.string().trim().min(1, "Nội dung không được để trống."),
  youtube: z.string().trim().optional(),
  order: z.coerce.number().int().default(0),
});

function resolveYoutubeId(raw: string | undefined): string | null | "invalid" {
  if (!raw) return null;
  const id = parseYoutubeId(raw);
  return id ?? "invalid";
}

export async function createLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    level: formData.get("level"),
    content: formData.get("content"),
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

  await prisma.lesson.create({
    data: {
      title: parsed.data.title,
      level: parsed.data.level,
      content: parsed.data.content,
      youtubeId,
      order: parsed.data.order,
    },
  });

  revalidatePath("/admin/lessons");
  redirect("/admin/lessons");
}

const updateSchema = lessonSchema.extend({
  lessonId: z.string().min(1),
});

export async function updateLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = updateSchema.safeParse({
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    level: formData.get("level"),
    content: formData.get("content"),
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

  const { lessonId } = parsed.data;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      level: parsed.data.level,
      content: parsed.data.content,
      youtubeId,
      order: parsed.data.order,
    },
  });

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect("/admin/lessons");
}

// No redirect here — callers differ on where they want to end up afterward
// (the edit page navigates away since its lesson is now gone, the list page
// just refreshes in place), so navigation is left to the client component.
export async function deleteLessonAction(lessonId: string) {
  await requireActiveSuperAdmin();
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath("/admin/lessons");
}
