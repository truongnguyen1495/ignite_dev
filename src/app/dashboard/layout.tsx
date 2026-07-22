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
  ShoppingCart,
  ShoppingBag,
  Package,
} from "lucide-react";
import { requireActiveStudent, isChatEnabled, isSalesEnabled, getAdminPermissions } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentChatInbox } from "@/lib/chat";
import { LEVEL_LABELS } from "@/lib/levels";
import { announcementVisibleTo } from "@/lib/announcements";
import { getDictionary } from "@/lib/i18n/get-locale";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstallAppButton } from "@/components/install-app-button";
import { LevelBadge } from "@/components/ui/level-badge";
import { LevelUpWatcher } from "./level-up-watcher";
import { HocSinhNav, type HocSinhNavItem } from "./hoc-sinh-nav";
import { SupportChatWidget } from "./support-chat-widget";

const iconClass = "h-4 w-4";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();
  const { t } = await getDictionary();

  const [announcements, reads, chatEnabled, salesEnabled, adminPermissions, cartCount] = await Promise.all([
    prisma.announcement.findMany({
      select: { id: true, minLevel: true, visibleToStudents: true, visibleToProspective: true, visibleToLeveled: true },
    }),
    prisma.announcementRead.findMany({
      where: { studentId: student.id },
      select: { announcementId: true },
    }),
    isChatEnabled(),
    isSalesEnabled(),
    getAdminPermissions(student.id),
    prisma.cartItem.count({ where: { studentId: student.id } }),
  ]);
  // An Admin Manager's full content access bypasses the AdminPermission
  // table entirely (see hasFullAdminAccess in src/lib/access.ts), so its size
  // alone would miss them here.
  const hasAdminAccess = adminPermissions.size > 0 || student.isAdminManager;
  const isLeveled = student.grantedLevel !== null;
  const chatInbox = chatEnabled && isLeveled ? await getStudentChatInbox(student) : null;
  const readIds = new Set(reads.map((r) => r.announcementId));
  const unreadAnnouncementCount = announcements.filter(
    (a) => a.visibleToStudents && announcementVisibleTo(a, student.grantedLevel) && !readIds.has(a.id)
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
    const hocSinhNavItems: HocSinhNavItem[] = [
      { href: "/dashboard/home", label: t.hocSinhNav.home, icon: <Home className="h-4 w-4" />, exact: true },
      { href: "/dashboard/announcements", label: t.hocSinhNav.announcements, icon: <Megaphone className="h-4 w-4" /> },
      { href: "/dashboard/courses", label: t.hocSinhNav.exclusiveCourses, icon: <Video className="h-4 w-4" /> },
      { href: "/dashboard/library", label: t.hocSinhNav.library, icon: <Library className="h-4 w-4" /> },
      {
        href: "/dashboard/level-up",
        label: t.hocSinhNav.joinFiveLevel,
        icon: <ArrowUpCircle className="h-4 w-4" />,
      },
      { href: "/dashboard/profile", label: t.hocSinhNav.profile, icon: <UserCircle className="h-4 w-4" /> },
    ];
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-8">
            <BrandLogo subtitle={t.brandSubtitle.hocSinh} />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {hasAdminAccess && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t.dashboardNav.goToAdmin}
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-semibold text-primary">
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
              {salesEnabled && (
                <Link
                  href="/dashboard/cart"
                  title="Giỏ hàng"
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-dark-strong">
                      {cartCount}
                    </span>
                  )}
                  <span className="sr-only">Giỏ hàng</span>
                </Link>
              )}
              {salesEnabled && (
                <Link
                  href="/dashboard/orders"
                  title={t.dashboardNav.myOrders}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="sr-only">{t.dashboardNav.myOrders}</span>
                </Link>
              )}
              <InstallAppButton />
              <LanguageSwitcher />
              <LogoutButton label={t.common.logout} />
            </div>
          </div>
          <HocSinhNav items={hocSinhNavItems} />
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</main>
        {chatEnabled && <SupportChatWidget studentId={student.id} />}
      </div>
    );
  }

  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: t.dashboardNav.fiveLevelTraining, icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/dashboard/courses", label: t.dashboardNav.exclusiveCourses, icon: <Video className={iconClass} /> },
    { href: "/dashboard/library", label: t.dashboardNav.library, icon: <Library className={iconClass} /> },
    { href: "/dashboard/products", label: t.dashboardNav.products, icon: <Package className={iconClass} /> },
    {
      href: "/dashboard/announcements",
      label: t.dashboardNav.announcements,
      icon: <Megaphone className={iconClass} />,
      badge: unreadAnnouncementCount,
    },
    ...(chatEnabled
      ? [
          {
            href: "/dashboard/chat",
            label: t.dashboardNav.chat,
            icon: <MessageCircle className={iconClass} />,
            badge: unreadChatCount,
          },
        ]
      : []),
    { href: "/dashboard/level-up", label: t.dashboardNav.levelUp, icon: <ArrowUpCircle className={iconClass} /> },
    { href: "/dashboard/profile", label: t.dashboardNav.profile, icon: <UserCircle className={iconClass} /> },
  ];

  return (
    <SidebarProvider>
      <LevelUpWatcher
        studentId={student.id}
        level={student.grantedLevel!}
        label={LEVEL_LABELS[student.grantedLevel!]}
      />
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle={t.brandSubtitle.hocVien} />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
          <SidebarToggle />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            {hasAdminAccess && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.dashboardNav.goToAdmin}
              </Link>
            )}
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-semibold text-primary">
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
            {salesEnabled && (
              <Link
                href="/dashboard/cart"
                title="Giỏ hàng"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-dark-strong">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Giỏ hàng</span>
              </Link>
            )}
            {salesEnabled && (
              <Link
                href="/dashboard/orders"
                title={t.dashboardNav.myOrders}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="sr-only">{t.dashboardNav.myOrders}</span>
              </Link>
            )}
            <InstallAppButton />
            <LanguageSwitcher />
            <LogoutButton label={t.common.logout} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
