import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { broadcastChatEvent } from "@/lib/chat";
import type { GuestChatSender } from "@prisma/client";

const GUEST_SESSION_COOKIE = "guest_chat_session";
const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
const MESSAGE_PREVIEW_LENGTH = 80;

// Must only be called from a Server Action or Route Handler, never a plain
// Server Component render — Next.js only allows mutating cookies from those
// two places. This is the entire guest identity: no name/email is ever
// collected, matching the site's "fully anonymous" design (see the
// GuestChatThread comment in schema.prisma).
export async function getOrCreateGuestSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(GUEST_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GUEST_SESSION_MAX_AGE,
    path: "/",
  });
  return id;
}

export async function getOrCreateGuestThread(guestSessionId: string) {
  return prisma.guestChatThread.upsert({
    where: { guestSessionId },
    update: {},
    create: { guestSessionId },
  });
}

function buildGuestMessagePreview(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > MESSAGE_PREVIEW_LENGTH ? `${trimmed.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : trimmed;
}

// senderAdminId is required when sender = "ADMIN" (which admin replied) and
// must be omitted for "GUEST" — there's no User to attribute a guest
// message to, by design.
export async function sendGuestChatMessage(
  threadId: string,
  sender: GuestChatSender,
  body: string,
  senderAdminId?: string
): Promise<void> {
  const trimmed = body.trim();
  await prisma.$transaction([
    prisma.guestChatMessage.create({
      data: { threadId, sender, body: trimmed, senderAdminId: sender === "ADMIN" ? senderAdminId : null },
    }),
    prisma.guestChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date(), lastMessagePreview: buildGuestMessagePreview(trimmed) },
    }),
  ]);
  // Same Realtime channel mechanism as authenticated chat (src/lib/chat.ts)
  // — it's keyed purely by threadId and carries no auth, so it works
  // unchanged for an anonymous guest's thread.
  await broadcastChatEvent(threadId);
}

export async function markGuestThreadReadByAdmin(threadId: string, adminId: string): Promise<void> {
  await prisma.guestChatThreadRead.upsert({
    where: { threadId_adminId: { threadId, adminId } },
    update: { lastReadAt: new Date() },
    create: { threadId, adminId },
  });
}

export type AdminGuestChatInboxRow = {
  threadId: string;
  guestLabel: string;
  lastMessagePreview: string | null;
  lastMessageAt: Date;
  unreadCount: number;
};

// The only identity a guest ever has — the last 6 characters of their
// session id, purely so an admin can tell two concurrent guest chats apart
// across a page refresh. Not a real name; nothing more is collected.
export function guestLabelFor(guestSessionId: string): string {
  return `Khách #${guestSessionId.slice(-6).toUpperCase()}`;
}

export async function getAdminGuestChatInbox(adminId: string): Promise<AdminGuestChatInboxRow[]> {
  const threads = await prisma.guestChatThread.findMany({ orderBy: { lastMessageAt: "desc" } });
  if (threads.length === 0) return [];

  const threadIds = threads.map((t) => t.id);
  const reads = await prisma.guestChatThreadRead.findMany({
    where: { threadId: { in: threadIds }, adminId },
    select: { threadId: true, lastReadAt: true },
  });
  const lastReadByThread = new Map(reads.map((r) => [r.threadId, r.lastReadAt]));

  const counts = await Promise.all(
    threads.map(async (thread) => {
      const lastReadAt = lastReadByThread.get(thread.id);
      if (lastReadAt && lastReadAt >= thread.lastMessageAt) return [thread.id, 0] as const;
      // Anything not sent by the viewing admin counts as unread — a GUEST
      // message, or a reply from a different admin (any admin may answer
      // any guest thread, same "no per-admin assignment" rule as SUPPORT).
      const count = await prisma.guestChatMessage.count({
        where: {
          threadId: thread.id,
          OR: [{ sender: "GUEST" }, { sender: "ADMIN", senderAdminId: { not: adminId } }],
          createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
        },
      });
      return [thread.id, count] as const;
    })
  );
  const countByThread = new Map(counts);

  return threads.map((thread) => ({
    threadId: thread.id,
    guestLabel: guestLabelFor(thread.guestSessionId),
    lastMessagePreview: thread.lastMessagePreview,
    lastMessageAt: thread.lastMessageAt,
    unreadCount: countByThread.get(thread.id) ?? 0,
  }));
}
