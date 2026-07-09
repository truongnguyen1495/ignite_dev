import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";
import { ANNOUNCEMENT_CATEGORY_LABELS, ANNOUNCEMENT_CATEGORY_BADGE_COLOR } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DeleteAnnouncementInlineButton } from "./delete-announcement-inline-button";

export default async function AnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bản tin"
        actions={
          <Link
            href="/admin/announcements/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Đăng bản tin mới
          </Link>
        }
      />

      {announcements.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin nào.</p>
      ) : (
        <ul className="space-y-2">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/50"
            >
              <Link
                href={`/admin/announcements/${announcement.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
              >
                <span className="text-foreground">{announcement.title}</span>
                <Badge color={ANNOUNCEMENT_CATEGORY_BADGE_COLOR[announcement.category]}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
                </Badge>
                {announcement.minLevel ? (
                  <Badge color="primary">{LEVEL_LABELS[announcement.minLevel]} trở lên</Badge>
                ) : (
                  <Badge color="muted">Tất cả học viên</Badge>
                )}
                <span className="text-xs text-muted">
                  {announcement.publishedAt.toLocaleDateString("vi-VN")}
                </span>
              </Link>
              <DeleteAnnouncementInlineButton
                announcementId={announcement.id}
                announcementTitle={announcement.title}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
