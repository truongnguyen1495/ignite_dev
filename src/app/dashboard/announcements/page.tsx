import { AlertTriangle } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN } from "@/lib/date";
import { AnnouncementTabs } from "./announcement-tabs";

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
    (a) => a.visibleToStudents && (!a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel))
  );

  const categories = ORDERED_ANNOUNCEMENT_CATEGORIES.map((category) => ({
    category,
    items: visible
      .filter((a) => a.category === category)
      .map((a) => ({
        id: a.id,
        title: a.title,
        coverImageUrl: a.coverImageUrl,
        publishedAt: formatDateVN(a.publishedAt),
        isUnread: !readIds.has(a.id),
      })),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem bản tin đó.
        </p>
      )}
      <PageHeader title="Bản tin" description="Thông báo mới nhất từ ban quản trị." />

      <AnnouncementTabs categories={categories} />
    </div>
  );
}
