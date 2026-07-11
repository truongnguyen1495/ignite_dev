import Link from "next/link";
import {
  LayoutDashboard,
  ArrowUpCircle,
  Video,
  UserCircle,
  Megaphone,
  Library,
  MessageCircle,
  ShieldCheck,
  Home,
} from "lucide-react";
import { requireActiveStudent, isChatEnabled, getAdminPermissions } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentChatInbox } from "@/lib/chat";
import { LEVEL_LABELS, hasLevelAccess } from "@/lib/levels";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LevelBadge } from "@/components/ui/level-badge";
import { LevelUpWatcher } from "./level-up-watcher";

const iconClass = "h-4 w-4";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();

  const [announcements, reads, chatEnabled, adminPermissions] = await Promise.all([
    prisma.announcement.findMany({ select: { id: true, minLevel: true, visibleToStudents: true } }),
    prisma.announcementRead.findMany({
      where: { studentId: student.id },
      select: { announcementId: true },
    }),
    isChatEnabled(),
    getAdminPermissions(student.id),
  ]);
  const hasAdminAccess = adminPermissions.size > 0;
  const isLeveled = student.grantedLevel !== null;
  const chatInbox = chatEnabled && isLeveled ? await getStudentChatInbox(student) : null;
  const readIds = new Set(reads.map((r) => r.announcementId));
  const unreadAnnouncementCount = announcements.filter(
    (a) =>
      a.visibleToStudents &&
      (!a.minLevel || hasLevelAccess(student.grantedLevel, a.minLevel)) &&
      !readIds.has(a.id)
  ).length;
  const unreadChatCount = chatInbox
    ? chatInbox.support.unreadCount +
      chatInbox.directThreads.reduce((sum, t) => sum + t.unreadCount, 0) +
      chatInbox.groupRooms.reduce((sum, r) => sum + r.unreadCount, 0)
    : 0;

  // "Học sinh" (grantedLevel null) get a page kế thừa từ khung trang khách
  // (/guest) — thanh nav ngang đơn giản, không sidebar — cộng thêm các tab
  // chỉ dành cho tài khoản đã đăng nhập: Tham gia hệ thống 5 cấp, Thông tin
  // cá nhân, Hồ sơ học sinh. "Học viên" (đã có cấp) giữ nguyên khung sidebar
  // hiện có, xem nhánh bên dưới.
  if (!isLeveled) {
    const linkClass =
      "flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-8">
            <BrandLogo subtitle="Học sinh" />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {hasAdminAccess && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Vào trang Admin
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {student.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground">{student.name}</span>
                  <span className="flex items-center gap-1.5">
                    {student.username && (
                      <span className="truncate text-[11px] text-muted">@{student.username}</span>
                    )}
                    <LevelBadge level={student.grantedLevel} />
                  </span>
                </span>
              </span>
              <LogoutButton />
            </div>
          </div>
          <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-8">
            <Link href="/dashboard/home" className={linkClass}>
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
            <Link href="/dashboard/announcements" className={linkClass}>
              <Megaphone className="h-4 w-4" />
              Bản tin
            </Link>
            <Link href="/dashboard/courses" className={linkClass}>
              <Video className="h-4 w-4" />
              Khóa học độc quyền
            </Link>
            <Link href="/dashboard/library" className={linkClass}>
              <Library className="h-4 w-4" />
              Thư viện
            </Link>
            <Link href="/dashboard/level-up" className={linkClass}>
              <ArrowUpCircle className="h-4 w-4" />
              Tham gia hệ thống 5 cấp
            </Link>
            <Link href="/dashboard/profile" className={linkClass}>
              <UserCircle className="h-4 w-4" />
              Thông tin cá nhân
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    );
  }

  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: "5 Cấp đào tạo", icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/dashboard/courses", label: "Khóa học độc quyền", icon: <Video className={iconClass} /> },
    { href: "/dashboard/library", label: "Thư viện", icon: <Library className={iconClass} /> },
    {
      href: "/dashboard/announcements",
      label: "Bản tin",
      icon: <Megaphone className={iconClass} />,
      badge: unreadAnnouncementCount,
    },
    ...(chatEnabled
      ? [
          {
            href: "/dashboard/chat",
            label: "Nhắn tin",
            icon: <MessageCircle className={iconClass} />,
            badge: unreadChatCount,
          },
        ]
      : []),
    { href: "/dashboard/level-up", label: "Xin lên cấp", icon: <ArrowUpCircle className={iconClass} /> },
    { href: "/dashboard/profile", label: "Thông tin cá nhân", icon: <UserCircle className={iconClass} /> },
  ];

  return (
    <SidebarProvider>
      <LevelUpWatcher
        studentId={student.id}
        level={student.grantedLevel!}
        label={LEVEL_LABELS[student.grantedLevel!]}
      />
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle="Học viên" />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
          <SidebarToggle />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            {hasAdminAccess && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Vào trang Admin
              </Link>
            )}
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {student.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-foreground">{student.name}</span>
                <span className="flex items-center gap-1.5">
                  {student.username && (
                    <span className="truncate text-[11px] text-muted">@{student.username}</span>
                  )}
                  <LevelBadge level={student.grantedLevel} />
                </span>
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
