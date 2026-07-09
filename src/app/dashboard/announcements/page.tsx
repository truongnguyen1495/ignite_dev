import Link from "next/link";
import { Megaphone, AlertTriangle } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.announcementRead.findMany({ where: { studentId: student.id }, select: { announcementId: true } }),
  ]);

  const readIds = new Set(reads.map((r) => r.announcementId));
  const visible = announcements.filter(
    (a) => !a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel)
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem bản tin đó.
        </p>
      )}
      <PageHeader title="Bản tin" description="Thông báo mới nhất từ ban quản trị." />

      {visible.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin nào.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((announcement) => {
            const isUnread = !readIds.has(announcement.id);
            return (
              <li key={announcement.id}>
                <Link
                  href={`/dashboard/announcements/${announcement.id}`}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 ${
                    isUnread ? "border-primary/30 bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <Megaphone
                    className={`h-4 w-4 shrink-0 ${isUnread ? "text-primary" : "text-muted"}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">{announcement.title}</span>
                  {isUnread && <Badge color="primary">Mới</Badge>}
                  <span className="shrink-0 text-xs text-muted">
                    {announcement.publishedAt.toLocaleDateString("vi-VN")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
