"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireActiveStudent,
  requireWhiteboardsEnabled,
  requireWhiteboardAccess,
  canEditWhiteboard,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { whiteboardElementsPayloadSchema } from "@/lib/whiteboard-elements";

// Student-side twin of src/app/admin/whiteboards/actions.ts — separate file
// (not shared/imported across the admin/dashboard route trees, matching
// this app's existing convention of never cross-importing between them)
// even though the underlying Prisma calls are nearly identical, since the
// gating differs: every action here requires requireActiveStudent() AND the
// requireWhiteboardsEnabled master switch, on top of the per-board
// requireWhiteboardAccess check both sides share.

export async function createMyWhiteboardAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const student = await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return "Tên bảng vẽ không được để trống.";
  }

  const board = await prisma.whiteboard.create({
    data: { title, createdById: student.id, lastEditedById: student.id },
  });

  revalidatePath("/dashboard/whiteboards");
  redirect(`/dashboard/whiteboards/${board.id}`);
}

export async function renameMyWhiteboardAction(boardId: string, title: string): Promise<string | undefined> {
  await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");
  const access = await requireWhiteboardAccess(boardId, "/dashboard/whiteboards?denied=1");
  if (!access) {
    return "Bảng vẽ không tồn tại.";
  }
  if (!canEditWhiteboard(access.role)) {
    return "Bạn chỉ có quyền xem bảng vẽ này.";
  }
  const trimmed = title.trim();
  if (!trimmed) {
    return "Tên bảng vẽ không được để trống.";
  }
  await prisma.whiteboard.update({ where: { id: boardId }, data: { title: trimmed } });
  revalidatePath("/dashboard/whiteboards");
}

export async function deleteMyWhiteboardAction(boardId: string) {
  await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");
  const access = await requireWhiteboardAccess(boardId, "/dashboard/whiteboards?denied=1");
  if (!access || !canEditWhiteboard(access.role)) return;
  await prisma.whiteboard.delete({ where: { id: boardId } });
  revalidatePath("/dashboard/whiteboards");
}

const saveWhiteboardSchema = z.object({
  elements: whiteboardElementsPayloadSchema,
  viewportX: z.number(),
  viewportY: z.number(),
  viewportZoom: z.number().positive(),
});

export async function saveMyWhiteboardAction(boardId: string, payload: unknown): Promise<string | undefined> {
  await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");
  const access = await requireWhiteboardAccess(boardId, "/dashboard/whiteboards?denied=1");
  if (!access) {
    return "Bảng vẽ không tồn tại.";
  }
  if (!canEditWhiteboard(access.role)) {
    return "Bạn chỉ có quyền xem bảng vẽ này.";
  }

  const parsed = saveWhiteboardSchema.safeParse(payload);
  if (!parsed.success) {
    return "Dữ liệu bảng vẽ không hợp lệ.";
  }

  await prisma.whiteboard.update({
    where: { id: boardId },
    data: {
      elements: parsed.data.elements,
      viewportX: parsed.data.viewportX,
      viewportY: parsed.data.viewportY,
      viewportZoom: parsed.data.viewportZoom,
      lastEditedById: access.user.id,
    },
  });

  revalidatePath(`/dashboard/whiteboards/${boardId}`);
  return undefined;
}
