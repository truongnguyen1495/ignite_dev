import Link from "next/link";
import { AlertTriangle, Megaphone } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import { Badge } from "@/components/ui/badge";
import type { AnnouncementCategory } from "@prisma/client";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; category?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied, category } = await searchParams;

  const activeCategory: AnnouncementCategory =
    category && (ORDERED_ANNOUNCEMENT_CATEGORIES as string[]).includes(category)
      ? (category as AnnouncementCategory)
      : ORDERED_ANNOUNCEMENT_CATEGORIES[0];

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({
      where: { category: activeCategory },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.announcementRead.findMany({ where: { studentId: student.id }, select: { announcementId: true } }),
  ]);
  const readIds = new Set(reads.map((r) => r.announcementId));
  const items = announcements.filter((a) => !a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel));

  return (
    <div className="space-y-4">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem bản tin đó.
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin nào.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const isUnread = !readIds.has(a.id);
            return (
              <li key={a.id}>
                <Link
                  href={`/dashboard/announcements/${a.id}`}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 ${
                    isUnread ? "border-primary/30 bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <Megaphone className={`h-4 w-4 shrink-0 ${isUnread ? "text-primary" : "text-muted"}`} />
                  <span className="min-w-0 flex-1 truncate text-foreground">{a.title}</span>
                  {isUnread && <Badge color="primary">Mới</Badge>}
                  <span className="shrink-0 text-xs text-muted">
                    {a.publishedAt.toLocaleDateString("vi-VN")}
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
