"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyAdminAccess, requireWhiteboardsEnabled, requireWhiteboardAccess, canEditWhiteboard } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { whiteboardElementsPayloadSchema } from "@/lib/whiteboard-elements";

export async function createWhiteboardAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { user: admin } = await requireAnyAdminAccess();
  await requireWhiteboardsEnabled("/admin?denied=1");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return "Tên bảng vẽ không được để trống.";
  }

  const board = await prisma.whiteboard.create({
    data: { title, createdById: admin.id, lastEditedById: admin.id },
  });

  revalidatePath("/admin/whiteboards");
  redirect(`/admin/whiteboards/${board.id}`);
}

export async function renameWhiteboardAction(boardId: string, title: string): Promise<string | undefined> {
  const access = await requireWhiteboardAccess(boardId, "/admin/whiteboards?denied=1");
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
  revalidatePath("/admin/whiteboards");
}

export async function deleteWhiteboardAction(boardId: string) {
  const access = await requireWhiteboardAccess(boardId, "/admin/whiteboards?denied=1");
  if (!access || !canEditWhiteboard(access.role)) return;
  await prisma.whiteboard.delete({ where: { id: boardId } });
  revalidatePath("/admin/whiteboards");
}

const saveWhiteboardSchema = z.object({
  elements: whiteboardElementsPayloadSchema,
  viewportX: z.number(),
  viewportY: z.number(),
  viewportZoom: z.number().positive(),
});

// Backs the editor's autosave — a single update, unlike
// saveLibraryBookPagesAction's delete-and-recreate transaction, since an
// infinite-canvas board has no per-page rows to reconcile (see the
// Whiteboard model's comment in prisma/schema.prisma).
export async function saveWhiteboardAction(
  boardId: string,
  payload: unknown
): Promise<string | undefined> {
  const access = await requireWhiteboardAccess(boardId, "/admin/whiteboards?denied=1");
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

  revalidatePath(`/admin/whiteboards/${boardId}`);
  return undefined;
}
