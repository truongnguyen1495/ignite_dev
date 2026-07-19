import { requireAdminSupportThreadAccess } from "@/lib/access";
import { markThreadRead } from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { ChatRealtimeRefresher } from "@/components/chat-realtime-refresher";
import { sendSupportReplyAction } from "../actions";

export default async function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const { admin, thread } = await requireAdminSupportThreadAccess(threadId);
  await markThreadRead(thread.id, admin.id);

  const [student, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: thread.supportStudentId! }, select: { name: true } }),
    prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div className="chat-shell-height mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-4">
        <BackLink href="/admin/chat">Quay lại</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">{student?.name ?? "Học viên"}</h1>
      </div>
      <ChatRealtimeRefresher threadId={thread.id} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <ChatMessageList messages={messages} currentUserId={admin.id} />
        <ChatMessageComposer onSend={sendSupportReplyAction.bind(null, thread.id)} />
      </div>
    </div>
  );
}
