import { cache } from "react";
import type { ChatThread, Level, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, hasLevelAccess } from "@/lib/levels";

const MESSAGE_PREVIEW_LENGTH = 80;

// DIRECT threads are stored with the lexicographically smaller User.id first
// so a given pair of users always maps to exactly one row, regardless of who
// sent the first message.
export function orderedPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

export function buildMessagePreview(body: string | null, hasAttachment: boolean): string {
  if (body?.trim()) {
    const trimmed = body.trim();
    return trimmed.length > MESSAGE_PREVIEW_LENGTH
      ? `${trimmed.slice(0, MESSAGE_PREVIEW_LENGTH)}…`
      : trimmed;
  }
  return hasAttachment ? "[Tệp đính kèm]" : "";
}

export async function getOrCreateSupportThread(studentId: string): Promise<ChatThread> {
  return prisma.chatThread.upsert({
    where: { supportStudentId: studentId },
    update: {},
    create: { kind: "SUPPORT", supportStudentId: studentId },
  });
}

export async function getOrCreateDirectThread(userAId: string, userBId: string): Promise<ChatThread> {
  const [directUserAId, directUserBId] = orderedPair(userAId, userBId);
  return prisma.chatThread.upsert({
    where: { directUserAId_directUserBId: { directUserAId, directUserBId } },
    update: {},
    create: { kind: "DIRECT", directUserAId, directUserBId },
  });
}

export async function getOrCreateGroupThread(level: Level): Promise<ChatThread> {
  return prisma.chatThread.upsert({
    where: { groupLevel: level },
    update: {},
    create: { kind: "GROUP", groupLevel: level },
  });
}

export type NewMessageInput = {
  body?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
};

// Shared by every sendXxxMessageAction — creates the message, bumps the
// thread's denormalized preview/timestamp, and fires the realtime ping, all
// after the caller has already run its own access check (this function does
// no authorization itself, by design, since each action's check differs).
export async function sendChatMessage(threadId: string, senderId: string, input: NewMessageInput): Promise<void> {
  // /api/chat/upload-attachment always scopes an attachment's storage path
  // to `${uploaderId}/...` — this function is the one place every
  // sendXxxMessageAction funnels through, so it's the single spot to reject
  // a client-supplied attachmentPath that doesn't belong to this sender
  // (someone else's file, or a guessed/leaked key), rather than trusting it
  // outright the way a bare Zod string schema would.
  if (input.attachmentPath && !input.attachmentPath.startsWith(`${senderId}/`)) {
    throw new Error("Attachment path does not belong to sender");
  }
  const body = input.body?.trim() || null;
  const preview = buildMessagePreview(body, !!input.attachmentPath);
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId,
        senderId,
        body,
        attachmentPath: input.attachmentPath ?? null,
        attachmentName: input.attachmentName ?? null,
        attachmentMime: input.attachmentMime ?? null,
        attachmentSize: input.attachmentSize ?? null,
      },
    }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date(), lastMessagePreview: preview },
    }),
  ]);
  await broadcastChatEvent(threadId);
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  await prisma.chatThreadRead.upsert({
    where: { threadId_userId: { threadId, userId } },
    update: { lastReadAt: new Date() },
    create: { threadId, userId },
  });
}

/**
 * Unread message count per thread, in two round trips no matter how many
 * threads there are.
 *
 * This used to issue one COUNT per thread inside a Promise.all. With
 * connection_limit=1 on DATABASE_URL those never overlapped — a member in a
 * handful of DMs plus their level's group rooms paid a dozen sequential
 * round trips, on every single dashboard page load, since the sidebar's
 * unread pill calls this on every render. It was the most expensive thing on
 * the page by a wide margin.
 *
 * The per-thread cutoff is what made a single COUNT look impossible: each
 * thread counts messages after *its own* lastReadAt. An OR of per-thread
 * conditions expresses exactly that in one WHERE, and groupBy brings the
 * counts back keyed by thread. Threads already fully read are dropped before
 * the query is built (that check needs no messages at all), so a caught-up
 * member sends no second query whatsoever.
 */
async function getUnreadCounts(threadIds: string[], userId: string): Promise<Map<string, number>> {
  if (threadIds.length === 0) return new Map();
  const [reads, threads] = await prisma.$transaction([
    prisma.chatThreadRead.findMany({
      where: { threadId: { in: threadIds }, userId },
      select: { threadId: true, lastReadAt: true },
    }),
    prisma.chatThread.findMany({
      where: { id: { in: threadIds } },
      select: { id: true, lastMessageAt: true },
    }),
  ]);
  const lastReadByThread = new Map(reads.map((r) => [r.threadId, r.lastReadAt]));

  const counts = new Map(threads.map((thread) => [thread.id, 0]));
  const unreadCandidates = threads.filter((thread) => {
    const lastReadAt = lastReadByThread.get(thread.id);
    return !lastReadAt || lastReadAt < thread.lastMessageAt;
  });
  if (unreadCandidates.length === 0) return counts;

  const rows = await prisma.chatMessage.groupBy({
    by: ["threadId"],
    where: {
      senderId: { not: userId },
      OR: unreadCandidates.map((thread) => {
        const lastReadAt = lastReadByThread.get(thread.id);
        return lastReadAt ? { threadId: thread.id, createdAt: { gt: lastReadAt } } : { threadId: thread.id };
      }),
    },
    _count: { _all: true },
  });
  for (const row of rows) {
    counts.set(row.threadId, row._count._all);
  }
  return counts;
}

export type StudentChatInbox = {
  support: { threadId: string | null; unreadCount: number };
  directThreads: {
    threadId: string;
    otherUser: { id: string; name: string };
    lastMessagePreview: string | null;
    lastMessageAt: Date;
    unreadCount: number;
  }[];
  groupRooms: { level: Level; accessible: boolean; unreadCount: number }[];
};

/**
 * Cached per request: the dashboard layout reads this for the sidebar's
 * unread pill, and /dashboard reads it again for the overview's "tin nhắn
 * chưa đọc" row. Both reach it through requireActiveStudent, which is itself
 * cache()d (see src/lib/access.ts) and therefore hands both callers the SAME
 * User object — cache() keys on argument identity, so that reference is what
 * makes the second call free instead of replaying four queries.
 */
export const getStudentChatInbox = cache(async (student: User): Promise<StudentChatInbox> => {
  // One batch, not Promise.all — connection_limit=1 means these three would
  // otherwise queue up as three round trips (see getUnreadCounts below).
  const [supportThread, directThreadRows, groupThreadRows] = await prisma.$transaction([
    prisma.chatThread.findUnique({ where: { supportStudentId: student.id } }),
    prisma.chatThread.findMany({
      where: { kind: "DIRECT", OR: [{ directUserAId: student.id }, { directUserBId: student.id }] },
      include: {
        directUserA: { select: { id: true, name: true } },
        directUserB: { select: { id: true, name: true } },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.chatThread.findMany({ where: { kind: "GROUP" } }),
  ]);

  const groupThreadByLevel = new Map(groupThreadRows.map((t) => [t.groupLevel, t]));
  // Same >= rule as content gating: a student can reach their own room and
  // every room below it, not just an exact match.
  const accessibleGroupThreadIds = ORDERED_LEVELS.filter((level) => hasLevelAccess(student.grantedLevel, level))
    .map((level) => groupThreadByLevel.get(level)?.id)
    .filter((id): id is string => !!id);
  const relevantThreadIds = [
    ...(supportThread ? [supportThread.id] : []),
    ...directThreadRows.map((t) => t.id),
    ...accessibleGroupThreadIds,
  ];
  const unreadCounts = await getUnreadCounts(relevantThreadIds, student.id);

  return {
    support: {
      threadId: supportThread?.id ?? null,
      unreadCount: supportThread ? (unreadCounts.get(supportThread.id) ?? 0) : 0,
    },
    directThreads: directThreadRows.map((thread) => {
      const otherUser = thread.directUserAId === student.id ? thread.directUserB! : thread.directUserA!;
      return {
        threadId: thread.id,
        otherUser: { id: otherUser.id, name: otherUser.name },
        lastMessagePreview: thread.lastMessagePreview,
        lastMessageAt: thread.lastMessageAt,
        unreadCount: unreadCounts.get(thread.id) ?? 0,
      };
    }),
    groupRooms: ORDERED_LEVELS.map((level) => {
      const accessible = hasLevelAccess(student.grantedLevel, level);
      const thread = groupThreadByLevel.get(level);
      return {
        level,
        accessible,
        unreadCount: accessible && thread ? (unreadCounts.get(thread.id) ?? 0) : 0,
      };
    }),
  };
});

export type AdminSupportInboxRow = {
  threadId: string;
  student: { id: string; name: string; grantedLevel: Level };
  lastMessagePreview: string | null;
  lastMessageAt: Date;
  unreadCount: number;
};

export async function getAdminSupportInbox(adminId: string): Promise<AdminSupportInboxRow[]> {
  const threads = await prisma.chatThread.findMany({
    where: { kind: "SUPPORT" },
    include: { supportStudent: { select: { id: true, name: true, grantedLevel: true } } },
    orderBy: { lastMessageAt: "desc" },
  });
  const unreadCounts = await getUnreadCounts(
    threads.map((t) => t.id),
    adminId
  );
  return threads.map((thread) => ({
    threadId: thread.id,
    student: thread.supportStudent!,
    lastMessagePreview: thread.lastMessagePreview,
    lastMessageAt: thread.lastMessageAt,
    unreadCount: unreadCounts.get(thread.id) ?? 0,
  }));
}

// Every level is open to every admin (see requireAdminGroupThreadAccess), so
// unlike the student inbox there's no "accessible" filtering — always all 5.
// A level with no ChatThread row yet (no student has posted there) just
// shows 0 unread; it's created lazily on first message, same as everywhere
// else.
export async function getAdminGroupRooms(adminId: string): Promise<{ level: Level; unreadCount: number }[]> {
  const threads = await prisma.chatThread.findMany({ where: { kind: "GROUP" } });
  const byLevel = new Map(threads.map((t) => [t.groupLevel, t]));
  const unreadCounts = await getUnreadCounts(
    threads.map((t) => t.id),
    adminId
  );
  return ORDERED_LEVELS.map((level) => {
    const thread = byLevel.get(level);
    return { level, unreadCount: thread ? (unreadCounts.get(thread.id) ?? 0) : 0 };
  });
}

// Fires a Supabase Realtime broadcast so any open thread view refetches —
// the payload deliberately carries no message content (just a signal),
// since actual message data always flows through authenticated Prisma reads.
// Uses the REST broadcast endpoint (not the JS client's channel().send())
// since that API assumes an already-open socket, a poor fit for a
// short-lived Vercel serverless function that just needs to fire one event
// and return. Best-effort: a failure here never blocks the message send
// (the message is already durably saved by the time this runs) — the
// thread still shows up correctly on the next normal page load/navigation.
export async function broadcastChatEvent(threadId: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: `chat-thread-${threadId}`, event: "new_message", payload: {} }],
      }),
    });
  } catch (error) {
    console.error("Chat broadcast failed:", error);
  }
}
