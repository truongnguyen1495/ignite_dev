import Link from "next/link";
import { ChevronRight, LifeBuoy, Users } from "lucide-react";
import { requireAdminPermission, requireChatEnabled } from "@/lib/access";
import { getAdminSupportInbox, getAdminGroupRooms } from "@/lib/chat";
import { LEVEL_LABELS } from "@/lib/levels";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
      {count}
    </span>
  );
}

export default async function AdminChatPage() {
  const admin = await requireAdminPermission("MANAGE_CHAT");
  await requireChatEnabled("/admin");
  const [threads, groupRooms] = await Promise.all([
    getAdminSupportInbox(admin.id),
    getAdminGroupRooms(admin.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Hỗ trợ học viên"
        description="Mọi luồng chat hỗ trợ đều mở cho tất cả admin trả lời."
        actions={
          <Link
            href="/admin/chat/new"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            + Nhắn tin mới
          </Link>
        }
      />

      <Card className="space-y-2">
        {threads.length === 0 ? (
          <p className="text-sm text-muted">Chưa có học viên nào nhắn tin hỗ trợ.</p>
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.threadId}
              href={`/admin/chat/${thread.threadId}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
            >
              <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{thread.student.name}</p>
                {thread.lastMessagePreview && (
                  <p className="truncate text-xs text-muted">{thread.lastMessagePreview}</p>
                )}
              </div>
              <UnreadBadge count={thread.unreadCount} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Chat nhóm theo cấp độ</h2>
        <div className="space-y-2">
          {groupRooms.map((room) => (
            <Link
              key={room.level}
              href={`/admin/chat/group/${room.level}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
            >
              <Users className="h-5 w-5 shrink-0 text-muted" />
              <span className="flex-1 text-sm text-foreground">{LEVEL_LABELS[room.level]}</span>
              <UnreadBadge count={room.unreadCount} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
