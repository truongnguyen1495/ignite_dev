"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireActiveStudent,
  requireLeveledStudent,
  requireChatEnabled,
  requireOwnSupportThreadAccess,
  requireDirectThreadAccess,
  requireGroupThreadAccess,
  userCanAccessChatThread,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseLevel } from "@/lib/levels";
import { getOrCreateDirectThread, getOrCreateGroupThread, sendChatMessage, markThreadRead } from "@/lib/chat";
import type { ChatMessageRow } from "@/components/chat-message-list";

const messageInputSchema = z
  .object({
    body: z.string().trim().max(4000).optional(),
    attachmentPath: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentMime: z.string().optional(),
    attachmentSize: z.number().optional(),
  })
  .refine((data) => !!data.body?.trim() || !!data.attachmentPath, {
    message: "Nhập nội dung hoặc đính kèm tệp.",
  });

export type MessageInput = z.infer<typeof messageInputSchema>;

export async function sendSupportMessageAction(input: MessageInput): Promise<string | undefined> {
  const { student, thread } = await requireOwnSupportThreadAccess();
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  await sendChatMessage(thread.id, student.id, parsed.data);
  revalidatePath("/dashboard/chat/support");
  revalidatePath("/dashboard/chat");
}

export async function sendDirectMessageAction(
  threadId: string,
  input: MessageInput
): Promise<string | undefined> {
  const { student, thread } = await requireDirectThreadAccess(threadId);
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  await sendChatMessage(thread.id, student.id, parsed.data);
  revalidatePath(`/dashboard/chat/dm/${threadId}`);
  revalidatePath("/dashboard/chat");
}

export async function sendGroupMessageAction(
  levelValue: string,
  input: MessageInput
): Promise<string | undefined> {
  const level = parseLevel(levelValue);
  if (!level) {
    return "Cấp độ không hợp lệ.";
  }
  const { student } = await requireGroupThreadAccess(level);
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const thread = await getOrCreateGroupThread(level);
  await sendChatMessage(thread.id, student.id, parsed.data);
  revalidatePath(`/dashboard/chat/group/${level}`);
  revalidatePath("/dashboard/chat");
}

export async function markThreadReadAction(threadId: string): Promise<void> {
  // requireActiveStudent, not requireLeveledStudent — a học sinh only ever
  // passes userCanAccessChatThread for their own SUPPORT thread (DIRECT/GROUP
  // both fail that check for a null grantedLevel), so widening this guard
  // doesn't open DIRECT/GROUP read-marking to them.
  const student = await requireActiveStudent();
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread || !userCanAccessChatThread(student, thread)) {
    return;
  }
  await markThreadRead(threadId, student.id);
}

// Powers the floating support-chat widget shown to học sinh (no-cấp
// students) on /dashboard/home — same underlying SUPPORT thread as the full
// /dashboard/chat/support page học viên use, just fetched as plain data for
// client-side state instead of server-rendered.
export async function openSupportChatAction(): Promise<{ threadId: string; messages: ChatMessageRow[] }> {
  const { student, thread } = await requireOwnSupportThreadAccess();
  await markThreadRead(thread.id, student.id);
  const messages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return { threadId: thread.id, messages };
}

export async function fetchSupportMessagesAction(): Promise<ChatMessageRow[]> {
  const { student, thread } = await requireOwnSupportThreadAccess();
  await markThreadRead(thread.id, student.id);
  return prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function startDirectThreadAction(otherStudentId: string): Promise<string | undefined> {
  const student = await requireLeveledStudent();
  await requireChatEnabled("/dashboard");
  if (otherStudentId === student.id) {
    return "Không thể nhắn tin với chính mình.";
  }
  const other = await prisma.user.findUnique({ where: { id: otherStudentId } });
  // A no-cấp account (grantedLevel null) has no chat access of its own — treat
  // it the same as "not found" so a leveled student can't start a thread that
  // recipient can never open.
  if (!other || other.role !== "STUDENT" || other.status !== "ACTIVE" || other.grantedLevel === null) {
    return "Không tìm thấy học viên này.";
  }
  const thread = await getOrCreateDirectThread(student.id, other.id);
  redirect(`/dashboard/chat/dm/${thread.id}`);
}

export async function searchStudentsAction(query: string): Promise<{ id: string; name: string; username: string | null }[]> {
  const student = await requireLeveledStudent();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      adminOnly: false,
      status: "ACTIVE",
      grantedLevel: { not: null },
      id: { not: student.id },
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { username: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    take: 20,
    orderBy: { name: "asc" },
  });
}
