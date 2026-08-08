"use server";

import { revalidatePath } from "next/cache";
import { requireWhiteboardAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Shared by both the admin and student whiteboard routes, same reasoning as
// whiteboard-share-actions.ts — the access rule is identical either way.
// Deliberately gated by requireWhiteboardAccess ALONE (never
// canManageWhiteboardSharing/canEditWhiteboard) — commenting is meant to be
// a lower bar than editing, same as a Google Doc's Viewer/Commenter tiers:
// anyone who can open the board at all may start or reply to a thread. This
// is what finally gives the COMMENTER share role (see share-dialog.tsx)
// something real to do.
const FALLBACK_DENIED_REDIRECT = "/admin/whiteboards?denied=1";

export type WhiteboardCommentItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  // ISO string, not a Date — this crosses the server action boundary, which
  // only serializes plain JSON.
  createdAt: string;
};

export type WhiteboardCommentThreadItem = {
  id: string;
  elementId: string;
  anchorU: number;
  anchorV: number;
  resolved: boolean;
  comments: WhiteboardCommentItem[];
};

function revalidateBoth(boardId: string) {
  revalidatePath(`/admin/whiteboards/${boardId}`);
  revalidatePath(`/dashboard/whiteboards/${boardId}`);
}

async function listThreads(boardId: string): Promise<WhiteboardCommentThreadItem[]> {
  const threads = await prisma.whiteboardCommentThread.findMany({
    where: { whiteboardId: boardId },
    include: {
      comments: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return threads.map((t) => ({
    id: t.id,
    elementId: t.elementId,
    anchorU: t.anchorU,
    anchorV: t.anchorV,
    resolved: t.resolved,
    comments: t.comments.map((c) => ({
      id: c.id,
      authorId: c.author.id,
      authorName: c.author.name,
      authorAvatarUrl: c.author.avatarUrl,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
}

// Called from the editor's own client component on mount rather than only
// loaded server-side by page.tsx — keeps the initial page load fast and lets
// the same fetch double as a manual refresh path if the realtime broadcast
// below is ever missed (a tab that was asleep, a dropped Realtime socket).
export async function getWhiteboardCommentThreadsAction(boardId: string): Promise<WhiteboardCommentThreadItem[]> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return [];
  return listThreads(boardId);
}

type CommentMutationResult = { error?: string; threads?: WhiteboardCommentThreadItem[] };

// Pins a brand-new thread to `elementId` at a fractional (anchorU, anchorV)
// offset of its box — see the schema comment on WhiteboardCommentThread for
// why this tracks the element instead of a raw canvas point.
export async function createWhiteboardCommentThreadAction(
  boardId: string,
  elementId: string,
  anchorU: number,
  anchorV: number,
  content: string
): Promise<CommentMutationResult> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return { error: "Bạn không có quyền bình luận trên bảng vẽ này." };
  const trimmed = content.trim();
  if (!trimmed) return { error: "Nội dung bình luận trống." };
  await prisma.whiteboardCommentThread.create({
    data: { whiteboardId: boardId, elementId, anchorU, anchorV, comments: { create: { authorId: access.user.id, content: trimmed } } },
  });
  revalidateBoth(boardId);
  return { threads: await listThreads(boardId) };
}

// Repositions an existing thread's pin around its element (dragging the pin
// itself — see comment-pins.tsx) — never touches which element it's
// attached to, just where on that element's box it sits.
export async function moveWhiteboardCommentThreadAnchorAction(
  boardId: string,
  threadId: string,
  anchorU: number,
  anchorV: number
): Promise<CommentMutationResult> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return { error: "Bạn không có quyền bình luận trên bảng vẽ này." };
  await prisma.whiteboardCommentThread.updateMany({ where: { id: threadId, whiteboardId: boardId }, data: { anchorU, anchorV } });
  revalidateBoth(boardId);
  return { threads: await listThreads(boardId) };
}

export async function addWhiteboardCommentReplyAction(
  boardId: string,
  threadId: string,
  content: string
): Promise<CommentMutationResult> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return { error: "Bạn không có quyền bình luận trên bảng vẽ này." };
  const trimmed = content.trim();
  if (!trimmed) return { error: "Nội dung bình luận trống." };
  const thread = await prisma.whiteboardCommentThread.findUnique({ where: { id: threadId }, select: { whiteboardId: true } });
  if (!thread || thread.whiteboardId !== boardId) return { error: "Không tìm thấy bình luận." };
  await prisma.whiteboardComment.create({ data: { threadId, authorId: access.user.id, content: trimmed } });
  revalidateBoth(boardId);
  return { threads: await listThreads(boardId) };
}

export async function setWhiteboardCommentThreadResolvedAction(
  boardId: string,
  threadId: string,
  resolved: boolean
): Promise<CommentMutationResult> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return { error: "Bạn không có quyền bình luận trên bảng vẽ này." };
  await prisma.whiteboardCommentThread.updateMany({ where: { id: threadId, whiteboardId: boardId }, data: { resolved } });
  revalidateBoth(boardId);
  return { threads: await listThreads(boardId) };
}
