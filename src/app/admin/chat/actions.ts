"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveSuperAdmin, requireAdminSupportThreadAccess, requireAdminGroupThreadAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseLevel } from "@/lib/levels";
import { sendChatMessage, markThreadRead, getOrCreateSupportThread, getOrCreateGroupThread } from "@/lib/chat";

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

export async function sendSupportReplyAction(
  threadId: string,
  input: MessageInput
): Promise<string | undefined> {
  const { admin, thread } = await requireAdminSupportThreadAccess(threadId);
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  await sendChatMessage(thread.id, admin.id, parsed.data);
  revalidatePath(`/admin/chat/${threadId}`);
  revalidatePath("/admin/chat");
}

export async function sendAdminGroupMessageAction(
  levelValue: string,
  input: MessageInput
): Promise<string | undefined> {
  const level = parseLevel(levelValue);
  if (!level) {
    return "Cấp độ không hợp lệ.";
  }
  const { admin } = await requireAdminGroupThreadAccess(level);
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }
  const thread = await getOrCreateGroupThread(level);
  await sendChatMessage(thread.id, admin.id, parsed.data);
  revalidatePath(`/admin/chat/group/${level}`);
  revalidatePath("/admin/chat");
}

// Generic — used for both support threads and group rooms, hence no kind
// check (mirrors markThreadRead itself, which just upserts a watermark).
export async function markThreadReadAction(threadId: string): Promise<void> {
  const admin = await requireActiveSuperAdmin();
  await markThreadRead(threadId, admin.id);
}

export async function searchStudentsForSupportAction(
  query: string
): Promise<{ id: string; name: string; username: string | null }[]> {
  await requireActiveSuperAdmin();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
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

// Lets an admin reach out first, unlike sendSupportReplyAction which only
// ever operates on a thread a student already started — this just opens
// (or creates, on the very first contact) that student's support thread and
// jumps straight to it, same lazy-creation idiom as getOrCreateSupportThread
// everywhere else.
export async function startSupportThreadAction(studentId: string): Promise<string | undefined> {
  await requireActiveSuperAdmin();
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT" || student.status !== "ACTIVE") {
    return "Không tìm thấy học viên này.";
  }
  const thread = await getOrCreateSupportThread(student.id);
  redirect(`/admin/chat/${thread.id}`);
}
