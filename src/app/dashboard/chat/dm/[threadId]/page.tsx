import { notFound } from "next/navigation";
import { requireDirectThreadAccess } from "@/lib/access";
import { markThreadRead } from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { ChatRealtimeRefresher } from "@/components/chat-realtime-refresher";
import { sendDirectMessageAction } from "../../actions";

export default async function DirectMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const { student, thread } = await requireDirectThreadAccess(threadId);
  if (thread.kind !== "DIRECT") {
    notFound();
  }
  await markThreadRead(thread.id, student.id);

  const otherUserId = thread.directUserAId === student.id ? thread.directUserBId! : thread.directUserAId!;
  const [otherUser, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: otherUserId }, select: { name: true } }),
    prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-2xl flex-col">
      <div className="mb-4">
        <BackLink href="/dashboard/chat/dm">Quay lại</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">{otherUser?.name ?? "Học viên"}</h1>
      </div>
      <ChatRealtimeRefresher threadId={thread.id} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <ChatMessageList messages={messages} currentUserId={student.id} />
        <ChatMessageComposer onSend={sendDirectMessageAction.bind(null, thread.id)} />
      </div>
    </div>
  );
}
