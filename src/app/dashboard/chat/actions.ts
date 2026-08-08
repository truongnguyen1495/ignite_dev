"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireActiveStudent,
  requireChatEnabled,
  requireOwnSupportThreadAccess,
  requireDirectThreadAccess,
  requireGroupThreadAccess,
  userCanAccessChatThread,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseLevel } from "@/lib/levels";
import { getOrCreateDirectThread, getOrCreateGroupThread, sendChatMessage, markThreadRead } from "@/lib/chat";

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
  const student = await requireActiveStudent();
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread || !userCanAccessChatThread(student, thread)) {
    return;
  }
  await markThreadRead(threadId, student.id);
}

export async function startDirectThreadAction(otherStudentId: string): Promise<string | undefined> {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  if (otherStudentId === student.id) {
    return "Không thể nhắn tin với chính mình.";
  }
  const other = await prisma.user.findUnique({ where: { id: otherStudentId } });
  if (!other || other.role !== "STUDENT" || other.status !== "ACTIVE") {
    return "Không tìm thấy học viên này.";
  }
  const thread = await getOrCreateDirectThread(student.id, other.id);
  redirect(`/dashboard/chat/dm/${thread.id}`);
}

export async function searchStudentsAction(query: string): Promise<{ id: string; name: string; username: string | null }[]> {
  const student = await requireActiveStudent();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      adminOnly: false,
      status: "ACTIVE",
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
