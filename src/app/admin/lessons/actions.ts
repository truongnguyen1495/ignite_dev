"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import { parseYoutubeId } from "@/lib/youtube";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống."),
  level: levelEnum,
  description: z.string().trim().optional(),
  content: z.string().trim().min(1, "Nội dung không được để trống."),
  youtube: z.string().trim().optional(),
});

// A lesson's order is only ever unique/meaningful within its own level (see
// the [level, order] orderBy on the lessons list) — this always appends to
// the end of that level's list. Order is no longer a free-text field an
// admin types in (see ReorderModal on /admin/lessons for how existing
// lessons get repositioned instead).
async function nextOrderForLevel(level: Level): Promise<number> {
  const { _max } = await prisma.lesson.aggregate({ where: { level }, _max: { order: true } });
  return (_max.order ?? -1) + 1;
}

function resolveYoutubeId(raw: string | undefined): string | null | "invalid" {
  if (!raw) return null;
  const id = parseYoutubeId(raw);
  return id ?? "invalid";
}

export async function createLessonAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    level: formData.get("level"),
    description: formData.get("description") || undefined,
    content: formData.get("content"),
    youtube: formData.get("youtube") || undefined,
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
      description: parsed.data.description || null,
      content: parsed.data.content,
      youtubeId,
      order: await nextOrderForLevel(parsed.data.level),
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
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");

  const parsed = updateSchema.safeParse({
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    level: formData.get("level"),
    description: formData.get("description") || undefined,
    content: formData.get("content"),
    youtube: formData.get("youtube") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const youtubeId = resolveYoutubeId(parsed.data.youtube);
  if (youtubeId === "invalid") {
    return "Link YouTube không hợp lệ.";
  }

  const { lessonId } = parsed.data;

  // A lesson moved to a different level has no meaningful old order there —
  // append it to the end of the new level's list. Staying in the same level
  // leaves order untouched (ReorderModal owns repositioning within a level).
  const current = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { level: true } });
  const orderUpdate =
    current && current.level !== parsed.data.level ? { order: await nextOrderForLevel(parsed.data.level) } : {};

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      level: parsed.data.level,
      description: parsed.data.description || null,
      content: parsed.data.content,
      youtubeId,
      ...orderUpdate,
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
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath("/admin/lessons");
}

// Persists a full drag-and-drop reorder from ReorderModal — called once per
// level (the admin/lessons page opens one modal per level group, since
// lessons are only ever ordered within their own level, never across
// levels), so orderedIds is already scoped to a single Level. Each id's new
// `order` is just its index in the array, one $transaction so the list
// never reads a half-applied order mid-write.
export async function reorderLessonsAction(orderedIds: string[]) {
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath("/admin/lessons");
}
