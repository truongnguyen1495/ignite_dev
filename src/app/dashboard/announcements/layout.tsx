import type { ReactNode } from "react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { ORDERED_ANNOUNCEMENT_CATEGORIES } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/page-header";
import { AnnouncementCategoryTabs } from "./announcement-category-tabs";

// Wraps the announcement list/reading page so the title and category tabs
// stay on screen as a sticky bar while a student reads a post, instead of
// disappearing behind a full page navigation.
export default async function AnnouncementsLayout({ children }: { children: ReactNode }) {
  const student = await requireActiveStudent();

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({ select: { id: true, category: true, minLevel: true } }),
    prisma.announcementRead.findMany({ where: { studentId: student.id }, select: { announcementId: true } }),
  ]);
  const readIds = new Set(reads.map((r) => r.announcementId));
  const visible = announcements.filter((a) => !a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel));

  const categories = ORDERED_ANNOUNCEMENT_CATEGORIES.map((category) => ({
    category,
    unreadCount: visible.filter((a) => a.category === category && !readIds.has(a.id)).length,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="sticky top-0 z-20 space-y-4 bg-background pb-4 pt-1">
        <PageHeader title="Bản tin" description="Thông báo mới nhất từ ban quản trị." />
        <AnnouncementCategoryTabs categories={categories} />
      </div>
      {children}
    </div>
  );
}
