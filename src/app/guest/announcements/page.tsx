import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { GuestAnnouncementList } from "./announcement-list";

// Reading searchParams already forces dynamic rendering, but declare this
// explicitly so it doesn't silently regress to a stale static snapshot if
// that usage ever changes — see src/app/guest/courses/page.tsx for what
// happens when a guest page has no dynamic API to trigger this.
export const dynamic = "force-dynamic";

export default async function GuestAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  const announcements = await prisma.announcement.findMany({
    // visibleToStudents doubles as a master hide switch: hidden-from-students
    // announcements never show up for guests either, regardless of visibleToGuest.
    where: { visibleToGuest: true, visibleToStudents: true },
    orderBy: { publishedAt: "desc" },
  });

  const items = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    coverImageUrl: a.coverImageUrl,
    publishedAt: a.publishedAt.toLocaleDateString("vi-VN"),
  }));

  return (
    <div className="space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bản tin này không công khai.
        </p>
      )}
      <PageHeader title="Bản tin" description="Thông báo công khai từ ban quản trị — không cần đăng nhập." />

      <GuestAnnouncementList announcements={items} />
    </div>
  );
}
