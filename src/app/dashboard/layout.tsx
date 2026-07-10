import { LayoutDashboard, ArrowUpCircle, GraduationCap, Video, UserCircle, Megaphone } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, hasLevelAccess } from "@/lib/levels";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LevelUpWatcher } from "./level-up-watcher";

const iconClass = "h-4 w-4";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({ select: { id: true, minLevel: true, visibleToStudents: true } }),
    prisma.announcementRead.findMany({
      where: { studentId: student.id },
      select: { announcementId: true },
    }),
  ]);
  const readIds = new Set(reads.map((r) => r.announcementId));
  const unreadAnnouncementCount = announcements.filter(
    (a) =>
      a.visibleToStudents &&
      (!a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel)) &&
      !readIds.has(a.id)
  ).length;

  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: "5 Cấp đào tạo", icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/dashboard/courses", label: "Khóa học độc quyền", icon: <Video className={iconClass} /> },
    {
      href: "/dashboard/announcements",
      label: "Bản tin",
      icon: <Megaphone className={iconClass} />,
      badge: unreadAnnouncementCount,
    },
    { href: "/dashboard/level-up", label: "Xin lên cấp", icon: <ArrowUpCircle className={iconClass} /> },
    { href: "/dashboard/profile", label: "Thông tin cá nhân", icon: <UserCircle className={iconClass} /> },
  ];

  return (
    <SidebarProvider>
      <LevelUpWatcher
        studentId={student.id}
        level={student.grantedLevel}
        label={LEVEL_LABELS[student.grantedLevel]}
      />
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle="Học viên" />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
          <SidebarToggle />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{student.name}</span>
              <span className="hidden shrink-0 text-foreground sm:inline">
                ({LEVEL_LABELS[student.grantedLevel]})
              </span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
