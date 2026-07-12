import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN } from "@/lib/date";
import { AnnouncementsList } from "./announcements-list";

export default async function AnnouncementsPage() {
  await requireAdminPermission("MANAGE_ANNOUNCEMENTS");
  const announcements = await prisma.announcement.findMany({ orderBy: { publishedAt: "desc" } });

  const items = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    coverImageUrl: a.coverImageUrl,
    category: a.category,
    minLevel: a.minLevel,
    openToProspectiveStudents: a.openToProspectiveStudents,
    visibleToGuest: a.visibleToGuest,
    visibleToStudents: a.visibleToStudents,
    publishedAtLabel: formatDateVN(a.publishedAt),
  }));

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

      <AnnouncementsList announcements={items} />
    </div>
  );
}
