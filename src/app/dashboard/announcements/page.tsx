import Link from "next/link";
import { AlertTriangle, Megaphone } from "lucide-react";
import { requireActiveStudent, requireAnnouncementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LessonMarkdown } from "@/components/lesson-markdown";
import type { AnnouncementCategory } from "@prisma/client";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; category?: string; id?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied, category, id } = await searchParams;

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

  // Reading a post is a same-page selection (via ?id=), not a navigation —
  // marking it read is a side effect of rendering it here, same as the old
  // dedicated detail route used to do.
  let selected: { title: string; publishedAt: Date; content: string } | null = null;
  if (id) {
    const { announcement } = await requireAnnouncementAccess(id);
    await prisma.announcementRead.upsert({
      where: { studentId_announcementId: { studentId: student.id, announcementId: id } },
      update: {},
      create: { studentId: student.id, announcementId: id },
    });
    selected = announcement;
    readIds.add(id);
  }

  return (
    <div className="space-y-4">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem bản tin đó.
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        <div className="space-y-2 lg:w-72 lg:shrink-0">
          {items.length === 0 ? (
            <p className="text-sm text-muted">Chưa có bản tin nào.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((a) => {
                const isUnread = !readIds.has(a.id);
                const isSelected = a.id === id;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/announcements?category=${activeCategory}&id=${a.id}`}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : isUnread
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-surface"
                      }`}
                    >
                      <Megaphone
                        className={`h-4 w-4 shrink-0 ${isUnread ? "text-primary" : "text-muted"}`}
                      />
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

        <div className="min-w-0 flex-1">
          {selected ? (
            <Card className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{selected.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {selected.publishedAt.toLocaleDateString("vi-VN")}
                </p>
              </div>
              <LessonMarkdown content={selected.content} />
            </Card>
          ) : (
            <Card className="flex items-center justify-center py-20 text-sm text-muted">
              Chọn một bản tin bên phải để đọc.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
