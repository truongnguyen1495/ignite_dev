import Link from "next/link";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { requireActiveSuperAdmin } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function AdminChatPage() {
  const admin = await requireActiveSuperAdmin();
  const threads = await getAdminSupportInbox(admin.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Hỗ trợ học viên" description="Mọi luồng chat hỗ trợ đều mở cho tất cả admin trả lời." />

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
