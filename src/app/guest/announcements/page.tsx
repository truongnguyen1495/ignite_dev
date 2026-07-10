import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/page-header";
import { GuestAnnouncementTabs } from "./announcement-tabs";

export default async function GuestAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  const announcements = await prisma.announcement.findMany({
    where: { visibleToGuest: true },
    orderBy: { publishedAt: "desc" },
  });

  const categories = ORDERED_ANNOUNCEMENT_CATEGORIES.map((category) => ({
    category,
    items: announcements
      .filter((a) => a.category === category)
      .map((a) => ({
        id: a.id,
        title: a.title,
        publishedAt: a.publishedAt.toLocaleDateString("vi-VN"),
      })),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bản tin này không công khai.
        </p>
      )}
      <PageHeader title="Bản tin" description="Thông báo công khai từ ban quản trị — không cần đăng nhập." />
      <GuestAnnouncementTabs categories={categories} />
    </div>
  );
}
