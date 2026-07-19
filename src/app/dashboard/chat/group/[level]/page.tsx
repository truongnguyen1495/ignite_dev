import { notFound } from "next/navigation";
import { requireGroupThreadAccess } from "@/lib/access";
import { getOrCreateGroupThread, markThreadRead } from "@/lib/chat";
import { parseLevel, LEVEL_LABELS } from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { ChatRealtimeRefresher } from "@/components/chat-realtime-refresher";
import { sendGroupMessageAction } from "../../actions";

export default async function GroupChatPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: levelParam } = await params;
  const level = parseLevel(levelParam);
  if (!level) {
    notFound();
  }

  const { student } = await requireGroupThreadAccess(level);
  const thread = await getOrCreateGroupThread(level);
  await markThreadRead(thread.id, student.id);

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return (
    <div className="chat-shell-height mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-4">
        <BackLink href="/dashboard/chat">Quay lại</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Chat nhóm — {LEVEL_LABELS[level]}</h1>
      </div>
      <ChatRealtimeRefresher threadId={thread.id} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <ChatMessageList messages={messages} currentUserId={student.id} />
        <ChatMessageComposer onSend={sendGroupMessageAction.bind(null, level)} />
      </div>
    </div>
  );
}
