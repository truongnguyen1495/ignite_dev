import Link from "next/link";
import { LifeBuoy, MessageSquare, Users, ChevronRight } from "lucide-react";
import { requireActiveStudent, requireChatEnabled } from "@/lib/access";
import { getStudentChatInbox } from "@/lib/chat";
import { LEVEL_LABELS } from "@/lib/levels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
      {count}
    </span>
  );
}

export default async function ChatInboxPage() {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  const inbox = await getStudentChatInbox(student);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Nhắn tin" description="Hỗ trợ từ admin, nhắn tin với học viên khác, và chat nhóm theo cấp độ." />

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Hỗ trợ</h2>
        <Link
          href="/dashboard/chat/support"
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
        >
          <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1 text-sm text-foreground">Trò chuyện với admin</span>
          <UnreadBadge count={inbox.support.unreadCount} />
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Nhắn tin trực tiếp</h2>
          <Link href="/dashboard/chat/dm/new" className="text-xs font-medium text-primary hover:text-primary-hover">
            + Cuộc trò chuyện mới
          </Link>
        </div>
        {inbox.directThreads.length === 0 ? (
          <p className="text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>
        ) : (
          <div className="space-y-2">
            {inbox.directThreads.map((thread) => (
              <Link
                key={thread.threadId}
                href={`/dashboard/chat/dm/${thread.threadId}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
              >
                <MessageSquare className="h-5 w-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{thread.otherUser.name}</p>
                  {thread.lastMessagePreview && (
                    <p className="truncate text-xs text-muted">{thread.lastMessagePreview}</p>
                  )}
                </div>
                <UnreadBadge count={thread.unreadCount} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Chat nhóm theo cấp độ</h2>
        <div className="space-y-2">
          {inbox.groupRooms.map((room) => {
            const content = (
              <>
                <Users className="h-5 w-5 shrink-0 text-muted" />
                <span className="flex-1 text-sm text-foreground">{LEVEL_LABELS[room.level]}</span>
                {!room.accessible && <Badge color="muted">Cấp cao hơn bạn</Badge>}
                <UnreadBadge count={room.unreadCount} />
                {room.accessible && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
              </>
            );
            return room.accessible ? (
              <Link
                key={room.level}
                href={`/dashboard/chat/group/${room.level}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
              >
                {content}
              </Link>
            ) : (
              <div
                key={room.level}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 opacity-50"
              >
                {content}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
