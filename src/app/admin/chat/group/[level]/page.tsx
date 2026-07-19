import { notFound } from "next/navigation";
import { requireAdminGroupThreadAccess } from "@/lib/access";
import { getOrCreateGroupThread, markThreadRead } from "@/lib/chat";
import { parseLevel, LEVEL_LABELS } from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { ChatRealtimeRefresher } from "@/components/chat-realtime-refresher";
import { sendAdminGroupMessageAction } from "../../actions";

export default async function AdminGroupChatPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: levelParam } = await params;
  const level = parseLevel(levelParam);
  if (!level) {
    notFound();
  }

  const { admin } = await requireAdminGroupThreadAccess(level);
  const thread = await getOrCreateGroupThread(level);
  await markThreadRead(thread.id, admin.id);

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return (
    <div className="chat-shell-height mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-4">
        <BackLink href="/admin/chat">Quay lại</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Chat nhóm — {LEVEL_LABELS[level]}</h1>
      </div>
      <ChatRealtimeRefresher threadId={thread.id} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <ChatMessageList messages={messages} currentUserId={admin.id} />
        <ChatMessageComposer onSend={sendAdminGroupMessageAction.bind(null, level)} />
      </div>
    </div>
  );
}
