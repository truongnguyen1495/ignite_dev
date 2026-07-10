"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveSuperAdmin, requireAdminSupportThreadAccess } from "@/lib/access";
import { sendChatMessage, markThreadRead } from "@/lib/chat";

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

export async function markSupportThreadReadAction(threadId: string): Promise<void> {
  const admin = await requireActiveSuperAdmin();
  await markThreadRead(threadId, admin.id);
}
