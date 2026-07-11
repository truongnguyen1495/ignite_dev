"use server";

import { z } from "zod";
import { isChatEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getOrCreateGuestSessionId, getOrCreateGuestThread, sendGuestChatMessage } from "@/lib/guest-chat";
import type { GuestChatSender } from "@prisma/client";

export type GuestChatMessageRow = {
  id: string;
  sender: GuestChatSender;
  body: string;
  createdAt: string;
};

async function loadMessages(threadId: string): Promise<GuestChatMessageRow[]> {
  const messages = await prisma.guestChatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return messages.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt.toISOString() }));
}

// Called only when the widget is first opened (not on every guest page
// load) — this is the one place a GuestChatThread row (and the identifying
// cookie) gets created, so browsing the guest area never writes to the DB
// unless someone actually opens the chat.
export async function openGuestChatAction(): Promise<{
  enabled: boolean;
  threadId: string | null;
  messages: GuestChatMessageRow[];
}> {
  if (!(await isChatEnabled())) {
    return { enabled: false, threadId: null, messages: [] };
  }
  const guestSessionId = await getOrCreateGuestSessionId();
  const thread = await getOrCreateGuestThread(guestSessionId);
  const messages = await loadMessages(thread.id);
  return { enabled: true, threadId: thread.id, messages };
}

const messageSchema = z.string().trim().min(1, "Nhập nội dung tin nhắn.").max(4000);

export async function sendGuestMessageAction(body: string): Promise<{ error?: string }> {
  if (!(await isChatEnabled())) {
    return { error: "Tính năng chat hiện đang tắt." };
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const guestSessionId = await getOrCreateGuestSessionId();
  const thread = await getOrCreateGuestThread(guestSessionId);
  await sendGuestChatMessage(thread.id, "GUEST", parsed.data);
  return {};
}

// Re-derives the thread from the caller's own cookie and only ever returns
// messages if it matches the requested threadId — a guest has no other way
// to prove ownership of a thread, so this is the one check standing between
// "refresh my own conversation" and "read anyone's conversation by guessing
// their thread id".
export async function fetchGuestMessagesAction(threadId: string): Promise<GuestChatMessageRow[]> {
  const guestSessionId = await getOrCreateGuestSessionId();
  const thread = await prisma.guestChatThread.findUnique({ where: { guestSessionId } });
  if (!thread || thread.id !== threadId) return [];
  return loadMessages(thread.id);
}
