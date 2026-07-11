import { notFound } from "next/navigation";
import { requireAdminPermission, requireChatEnabled } from "@/lib/access";
import { markGuestThreadReadByAdmin, guestLabelFor } from "@/lib/guest-chat";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { GuestChatMessageList } from "@/components/guest-chat-message-list";
import { GuestChatComposer } from "@/components/guest-chat-composer";
import { ChatRealtimeRefresher } from "@/components/chat-realtime-refresher";
import { sendGuestSupportReplyAction } from "../../actions";

export default async function AdminGuestChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const admin = await requireAdminPermission("MANAGE_CHAT");
  await requireChatEnabled("/admin");
  const { threadId } = await params;

  const thread = await prisma.guestChatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    notFound();
  }
  await markGuestThreadReadByAdmin(thread.id, admin.id);

  const messages = await prisma.guestChatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-2xl flex-col">
      <div className="mb-4">
        <BackLink href="/admin/chat">Quay lại</BackLink>
        <h1 className="mt-2 text-xl font-semibold text-foreground">{guestLabelFor(thread.guestSessionId)}</h1>
      </div>
      <ChatRealtimeRefresher threadId={thread.id} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <GuestChatMessageList messages={messages} viewerSender="ADMIN" />
        <GuestChatComposer onSend={sendGuestSupportReplyAction.bind(null, thread.id)} />
      </div>
    </div>
  );
}
