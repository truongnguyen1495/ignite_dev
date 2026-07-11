import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { requireActiveStudent, requireChatEnabled } from "@/lib/access";
import { getStudentChatInbox } from "@/lib/chat";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

export default async function DirectMessageListPage() {
  const student = await requireActiveStudent();
  await requireChatEnabled("/dashboard");
  const inbox = await getStudentChatInbox(student);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/dashboard/chat">Quay lại</BackLink>
        <div className="mt-2">
          <PageHeader
            title="Nhắn tin trực tiếp"
            actions={
              <Link
                href="/dashboard/chat/dm/new"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                + Cuộc trò chuyện mới
              </Link>
            }
          />
        </div>
      </div>

      <Card className="space-y-2">
        {inbox.directThreads.length === 0 ? (
          <p className="text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>
        ) : (
          inbox.directThreads.map((thread) => (
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
              {thread.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                  {thread.unreadCount}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
